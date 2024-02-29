"use client"

import { ChangeEvent, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppContext } from "@/context/StoryContext"
import UploadBoxComponent from "@/components/upload/upload-box-component";
import axios from "axios"
import SuccessfullyUploadComponent from "./success-component";

const UploadComponent = () => {
    // console.log("uploading: ",uploading);
    
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_KEY;

    const { 
        challengeImage,
        uploading, setUploading,
        uploaded, setUploaded,
        uploadedImage, setUploadedImage
    } = useContext(AppContext)


    const handleFileChange = (event: any) => {
        const file = event.target.files[0];
        if (file) {

            setChallengeImage(null)
            setChallengeImage(file)
            const reader = new FileReader();
            setInPreview(true)

            reader.onload = (e) => {
                document.getElementById('preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    const onUploadProgress = (progressEvent: any) => {
        const { loaded, total } = progressEvent;
        
        let percent = Math.floor((loaded * 100) / total);
        console.log(`${percent}%`);
        setUploading(true)
        
        const progressBar = document.getElementById("progress-bar")
        if (progressBar) {            
            progressBar.style.width = `${percent}%`;
            if (percent < 100) {
                progressBar.style.width = `${percent}%`;
        
                // console.log(`${loaded} bytes of ${total} bytes. ${percent}%`);
            }else{
                setUploading(false)
                setUploaded(true)
            }
        }

    };
    

    const uploadImage = async () => {
        const preset_key = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_KEY
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
                
        setUploading(true)
        
        try{
            if (challengeImage && preset_key && cloudName) {
                const formData = new FormData();
                formData.append("file", challengeImage)
                formData.append("upload_preset", preset_key)
                
                console.log("uploading: ", uploading);
                axios.post(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, 
                    formData, 
                    {                    
                        onUploadProgress,
                    }
                )
                .then(res => {
                    console.log("Image: ",res.data.url);
                    setUploadedImage(res?.data?.secure_url)
                    setUploaded(true)
                    setUploading(false)

                })
                .catch(err => console.log(err))   
        
            };
        } catch(error){
            console.log(error)            
        }
        finally{
            setUploading(false)
        }
    }
    
    return (
        <div className="mb-7">
            <div className='flex justify-center mb-3 bg-white p-5 rounded-2xl'>                
                { (!uploaded) && <UploadBoxComponent />}
                { (uploaded) && <SuccessfullyUploadComponent />}
            </div>

            <div>
                <div id="upload-progress-box" className="mb-2 h-1 rounded-lg">
                    <div id="progress-bar" className="h-full rounded-lg"></div>
                </div>
                {/* <div className="flex justify-end gap-5">
                    <button className="bg-black text-white px-4 text-xs py-2 rounded-xl "
                    disabled={uploading || uploaded } 
                        onClick={uploadImage}>Upload</button>
                </div> */}

            </div>
            
            
        </div>
    )
}

export default UploadComponent;