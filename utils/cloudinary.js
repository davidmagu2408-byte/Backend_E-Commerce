const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // secure: true, // Ensures HTTPS URLs are generated
});

const uploadImage = async (imagePath) => {
  try {
    if (imagePath && imagePath.buffer) {
      // Handle file buffer from multer
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          },
        );
        stream.end(imagePath.buffer);
      });
    } else {
      // Handle path or array of paths
      const { default: pLimit } = await import("p-limit");
      const limit = pLimit(2);
      const imagesList = Array.isArray(imagePath)
        ? imagePath
        : imagePath
          ? [imagePath]
          : [];

      const uploadTasks = imagesList.map((image) =>
        limit(async () => {
          const result = await cloudinary.uploader.upload(image);
          return result;
        }),
      );

      const uploadStatus = await Promise.all(uploadTasks);
      const imgUrl = uploadStatus.map((item) => item.secure_url);
      return imgUrl;
    }
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  uploadImage,
};
