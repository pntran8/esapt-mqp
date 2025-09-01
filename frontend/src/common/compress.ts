

export const compressImageFile = (file: File): Promise<File> => {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            if (!e.target?.result) return;
            img.src = e.target.result as string;
            const dataURL = img.src as string;
            localStorage.setItem("imageDataURL", dataURL);
            console.log("imageDataURL ", localStorage.getItem("imageDataURL"));
        };

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 1200;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return;
                    const newFile = new File([blob], file.name, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                },
                "image/jpeg",
                1
            );
        };

        reader.readAsDataURL(file);

    });
};