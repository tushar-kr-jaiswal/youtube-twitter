import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (loaclFilePath) => {
    try {
        if (!loaclFilePath) {
            console.log("File not Found !!!");
        }
        const response = await cloudinary.uploader.upload(loaclFilePath, {
            resource_type: "auto",
        });

        console.log(`⚙️  File has been uploaded ~ ${response.url}`);

        fs.unlinkSync(loaclFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(loaclFilePath);
        return null;
    }
};

export { uploadOnCloudinary };
