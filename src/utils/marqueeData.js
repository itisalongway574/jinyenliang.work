const createItems = ({ images, totalItems }) =>
    Array.from({ length: totalItems }, (_, index) => ({
        img: images[index % images.length],
        title: `This is the ${index + 1} project`,
        width: Math.floor(50 + Math.random() * 51),
    }));

const createMarqueeItems = ({ images, totalItems }) => {
    const items = createItems({ images, totalItems });
    const splitIndex = Math.floor(items.length / 2);
    const leftItems = items.slice(0, splitIndex);
    const rightItems = items.slice(splitIndex);

    return {
        items,
        leftItems,
        rightItems,
        marqueeItemsLeft: [...leftItems, ...leftItems],
        marqueeItemsRight: [...rightItems, ...rightItems],
        marqueeItemsMobile: [...items, ...items],
    };
};

export { createMarqueeItems };
