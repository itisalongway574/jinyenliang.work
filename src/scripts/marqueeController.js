// 預設選取器：對應左右兩欄與監聽事件的群組容器
const DEFAULT_SELECTORS = {
    group: "body",
    left: '[data-marquee="css"]',
    right: '[data-marquee="css-reverse"]',
};

// 讓位移值在 0 ~ max 之間循環（避免無限累積）
const wrapValue = (value, max) => {
    if (!max) return 0;
    return ((value % max) + max) % max;
};

// 速度限制在最小/最大值之間
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// 確保清單高度足夠，至少達到容器高度的 2 倍，才能無縫循環
// 若不夠就複製現有項目追加（最多複製 5 次避免無限迴圈）
const ensureLoopHeight = (wrapper, list, debug = false) => {
    const minHeight = wrapper.clientHeight * 2;
    let guard = 0;
    while (list.scrollHeight < minHeight && guard < 5) {
        const items = Array.from(list.children);
        const fragment = document.createDocumentFragment();
        items.forEach((item) => fragment.appendChild(item.cloneNode(true)));
        list.appendChild(fragment);
        guard += 1;
    }
    if (debug) {
        console.log("[marquee-css] ensure height", {
            height: list.scrollHeight,
            minHeight,
        });
    }
};

// 建立單欄 marquee 控制器（左/右欄共用）
const createMarqueeController = ({
    root,
    autoDirection = 1,
    duration = 60000,
    debug = false,
}) => {
    if (!root) return null;
    // wrapper 會掛載 CSS 變數 --marquee-offset 來驅動 translateY
    const wrapper = root.querySelector(".js-marquee-css");
    const list = wrapper?.querySelector("ul");
    if (!wrapper || !list) return null;

    ensureLoopHeight(wrapper, list, debug);

    // controller 用來集中管理位移、速度、最大距離等狀態
    const controller = {
        wrapper,
        list,
        autoDirection,
        wheelDirection: autoDirection * -1,
        maxOffset: 0,
        offset: 0,
        velocity: 0,
        autoSpeed: 0,
    };

    // 計算最大可循環距離與自動速度
    // maxOffset 為 list 高度的一半，因為清單被複製一倍形成循環
    const updateMetrics = () => {
        controller.maxOffset = list.scrollHeight / 2;
        controller.offset = wrapValue(controller.offset, controller.maxOffset);
        // 每個 duration 時間走完整個 maxOffset，形成固定循環速度
        controller.autoSpeed = controller.maxOffset / duration;
        wrapper.style.setProperty(
            "--marquee-offset",
            `${-controller.offset}px`,
        );
        if (debug) {
            console.log("[marquee-css] metrics", {
                maxOffset: controller.maxOffset,
            });
        }
    };

    // 畫面大小或內容高度改變時更新量測
    window.addEventListener("resize", updateMetrics);
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(updateMetrics);
        ro.observe(list);
    } else {
        window.addEventListener("load", updateMetrics);
    }

    updateMetrics();
    return controller;
};

// 初始化左右兩欄，並統一綁定 wheel / touch / drag 事件
const initMarquee = ({
    groupSelector = DEFAULT_SELECTORS.group,
    leftSelector = DEFAULT_SELECTORS.left,
    rightSelector = DEFAULT_SELECTORS.right,
    wheelForce = 0.03,
    friction = 0.9,
    maxVelocity = 2.2,
    duration = 60000,
    debug = false,
} = {}) => {
    // group 為事件綁定範圍（預設 body，也可指定容器）
    const group =
        groupSelector === "body"
            ? document.body
            : document.querySelector(groupSelector);
    if (!group) return;

    // 左右欄各建立一個控制器，autoDirection 決定自動方向
    const controllers = [
        createMarqueeController({
            root: document.querySelector(leftSelector),
            autoDirection: 1,
            duration,
            debug,
        }),
        createMarqueeController({
            root: document.querySelector(rightSelector),
            autoDirection: -1,
            duration,
            debug,
        }),
    ].filter(Boolean);

    if (!controllers.length) return;

    // 將輸入的位移量轉成速度變化（會被摩擦力逐步衰減）
    // wheelDirection 讓左右欄的「滾動方向」互為反向
    const applyDelta = (deltaY) => {
        controllers.forEach((controller) => {
            controller.velocity = clamp(
                controller.velocity +
                deltaY * wheelForce * controller.wheelDirection,
                -maxVelocity,
                maxVelocity,
            );
        });
        if (!rafId) rafId = requestAnimationFrame(tick);
    };

    let rafId = null;
    // lastTime 讓每次 tick 取得實際時間差，避免速度受幀率影響
    let lastTime = 0;

    // 單一動畫迴圈：自動位移 + 使用者輸入速度
    const tick = (now) => {
        rafId = null;
        if (!lastTime) lastTime = now;
        // delta 為兩幀間隔，最多 50ms 避免分頁切換造成暴衝
        const delta = Math.min(now - lastTime, 50);
        lastTime = now;
        let active = false;
        controllers.forEach((controller) => {
            if (!controller.maxOffset) return;
            // baseMove：自動移動距離（方向由 autoDirection 控制）
            const baseMove =
                controller.autoSpeed * controller.autoDirection * delta;
            // wheelMove：由 wheel / touch / drag 影響的速度積分
            const wheelMove = controller.velocity * delta;
            // offset 會被 wrap 成 0 ~ maxOffset，形成無縫循環
            controller.offset = wrapValue(
                controller.offset + baseMove + wheelMove,
                controller.maxOffset,
            );
            // 摩擦力：讓速度以時間為單位逐步衰減
            controller.velocity *= Math.pow(friction, delta / 16.67);
            controller.wrapper.style.setProperty(
                "--marquee-offset",
                `${-controller.offset}px`,
            );
            active = true;
        });

        if (active) rafId = requestAnimationFrame(tick);
    };

    // 滾輪：以 deltaY 影響速度
    const onWheel = (event) => {
        event.preventDefault();
        applyDelta(event.deltaY);
    };

    let touchLastY = 0;
    // 觸控：以上一個 touch 位置計算 deltaY
    const onTouchStart = (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        touchLastY = touch.clientY;
    };
    const onTouchMove = (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        event.preventDefault();
        const deltaY = touchLastY - touch.clientY;
        touchLastY = touch.clientY;
        applyDelta(deltaY);
    };

    let isDragging = false;
    let dragLastY = 0;
    // 滑鼠拖曳：只處理 mouse pointer，避免跟 touch 重複
    const onPointerDown = (event) => {
        if (event.pointerType !== "mouse") return;
        isDragging = true;
        dragLastY = event.clientY;
        document.body.classList.add("is-dragging");
    };
    const onPointerMove = (event) => {
        if (!isDragging) return;
        event.preventDefault();
        const deltaY = dragLastY - event.clientY;
        dragLastY = event.clientY;
        applyDelta(deltaY);
    };
    const onPointerUp = () => {
        isDragging = false;
        document.body.classList.remove("is-dragging");
    };

    // 避免圖片被瀏覽器原生拖曳影響體驗
    const onDragStart = (event) => {
        const target = event.target;
        if (target && target.tagName === "IMG") {
            event.preventDefault();
        }
    };

    // 事件綁定：wheel/touch 需 preventDefault，故使用 passive: false
    group.addEventListener("wheel", onWheel, { passive: false });
    group.addEventListener("touchstart", onTouchStart, { passive: true });
    group.addEventListener("touchmove", onTouchMove, { passive: false });
    group.addEventListener("dragstart", onDragStart);
    group.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    if (!rafId) rafId = requestAnimationFrame(tick);
};

export { initMarquee };

if (typeof window !== "undefined") {
    if (!window.__MARQUEE_INITED__) {
        window.__MARQUEE_INITED__ = true;
        const DEBUG = Boolean(window.__MARQUEE_DEBUG__);
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                initMarquee({ debug: DEBUG });
            });
        } else {
            initMarquee({ debug: DEBUG });
        }
    }
}
