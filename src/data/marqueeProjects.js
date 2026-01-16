/**
 * Marquee Projects 資料層
 * 統一管理 project 資料、圖片對應、轉換邏輯
 * index.astro 只需引入 marqueeItemsLeft / Right / Mobile 即可
 */

// 使用 import.meta.glob 自動抓取 src/assets 下所有圖片
// eager: true 確保同步取得 ESM import
const allImages = import.meta.glob("../assets/**/*.{jpg,jpeg,png,webp}", {
    eager: true,
});

// 建立 imageMap：key 為相對路徑（例如 "gh-62nd/img-1.jpeg"）
const imageMap = {};
for (const path in allImages) {
    // path 格式：../assets/gh-62nd/img-1.jpeg
    // 轉成：gh-62nd/img-1.jpeg
    const key = path.replace("../assets/", "");
    imageMap[key] = allImages[path].default;
}

/**
 * 自動偵測資料夾內的 img-* 圖片
 * 支援 .jpg / .jpeg / .png
 * 回傳排序後的路徑陣列
 */
const getImagesFromFolder = (folder) => {
    const regex = new RegExp(`^${folder}/img-(\\d+)\\.(jpg|jpeg|png|webp)$`);
    const matches = [];

    for (const key in imageMap) {
        const match = key.match(regex);
        if (match) {
            matches.push({
                path: key,
                index: parseInt(match[1], 10),
            });
        }
    }

    // 依 img-* 的數字排序
    matches.sort((a, b) => a.index - b.index);
    return matches.map((m) => m.path);
};

/**
 * 以 project 為單位的資料
 * folder: 資料夾名稱（對應 src/assets/{folder}/）
 * name_eng: 專案英文名稱
 * name_tc: 專案中文名稱
 * alt: 圖片 alt（選填，預設用 name）
 *
 * 圖片會自動偵測 folder 內所有 img-* 檔案
 */
const projects = [
    {
        folder: "gh-62nd",
        name_eng: "62nd Golden Horse Award Ceremony Website",
        name_tc: "第62屆金馬獎頒獎典禮網站",
        alt: "第62屆金馬獎頒獎典禮網站",
    },
    {
        folder: "gh-61st",
        name_eng: "61st Golden Horse Award Ceremony Website",
        name_tc: "第61屆金馬獎頒獎典禮網站",
        alt: "第61屬金馬獎頒獎典禮網站",
    },
    {
        folder: "reporter",
        name_eng: "The Reporter 10th Anniversary Website",
        name_tc: "報導者10週年線上展覽",
        alt: "報導者10週年線上展覽",
    },
    {
        folder: "sunset",
        name_eng: "Sunset Town Festival-Burn Out",
        name_tc: "夕陽小鎮《燒胎祭》",
        alt: "夕陽小鎮《燒胎祭》",
    },
];

// 轉換：依 project 產生 item 清單
const createItemsFromProjects = () =>
    projects.flatMap((project, projectIndex) => {
        const imgPaths = getImagesFromFolder(project.folder);
        return imgPaths.map((filename, index) => ({
            img: imageMap[filename],
            name_eng: project.name_eng,
            name_tc: project.name_tc,
            alt: project.alt || project.name_eng,
            width: Math.floor(50 + Math.random() * 51),
            projectIndex,
            imageIndex: index,
        }));
    });

// 產生分欄清單（避免在資料層先複製，避免隨機後重複項貼在一起）
const items = createItemsFromProjects();
const splitIndex = Math.floor(items.length / 2);
const leftItems = items.slice(0, splitIndex);
const rightItems = items.slice(splitIndex);

export const marqueeItemsLeft = leftItems;
export const marqueeItemsRight = rightItems;
export const marqueeItemsMobile = items;
