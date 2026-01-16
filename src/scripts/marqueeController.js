const DEFAULT_SELECTORS = {
    group: "body",
    left: '[data-marquee="css"]',
    right: '[data-marquee="css-reverse"]',
};

const wrapValue = (value, max) => {
    if (!max) return 0;
    return ((value % max) + max) % max;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const createMarqueeController = ({
    root,
    autoDirection = 1,
    duration = 60000,
    debug = false,
}) => {
    if (!root) return null;
    const wrapper = root.querySelector(".js-marquee-css");
    const list = wrapper?.querySelector("ul");
    if (!wrapper || !list) return null;

    ensureLoopHeight(wrapper, list, debug);

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

    const updateMetrics = () => {
        controller.maxOffset = list.scrollHeight / 2;
        controller.offset = wrapValue(controller.offset, controller.maxOffset);
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
    const group =
        groupSelector === "body"
            ? document.body
            : document.querySelector(groupSelector);
    if (!group) return;

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
    let lastTime = 0;

    const tick = (now) => {
        rafId = null;
        if (!lastTime) lastTime = now;
        const delta = Math.min(now - lastTime, 50);
        lastTime = now;
        let active = false;
        controllers.forEach((controller) => {
            if (!controller.maxOffset) return;
            const baseMove =
                controller.autoSpeed * controller.autoDirection * delta;
            const wheelMove = controller.velocity * delta;
            controller.offset = wrapValue(
                controller.offset + baseMove + wheelMove,
                controller.maxOffset,
            );
            controller.velocity *= Math.pow(friction, delta / 16.67);
            controller.wrapper.style.setProperty(
                "--marquee-offset",
                `${-controller.offset}px`,
            );
            active = true;
        });

        if (active) rafId = requestAnimationFrame(tick);
    };

    const onWheel = (event) => {
        event.preventDefault();
        applyDelta(event.deltaY);
    };

    let touchLastY = 0;
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

    const onDragStart = (event) => {
        const target = event.target;
        if (target && target.tagName === "IMG") {
            event.preventDefault();
        }
    };

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
