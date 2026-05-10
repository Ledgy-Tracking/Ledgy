export const nanoid = (size: number = 21): string => {
    return Array.from({ length: size }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.charAt(Math.floor(Math.random() * 64))
    ).join('');
};
