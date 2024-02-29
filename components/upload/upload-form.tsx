"use client"

import { Button } from "@/components/ui/button";
import PreviewComponent from "@/components/upload/preview-component";
import UploadComponent from "@/components/upload/upload-component";
import UploadBoxComponent from "@/components/upload/upload-box-component";
import { AppContext } from "@/context/StoryContext"
import { ChangeEvent, useContext, useEffect, useState } from "react";
import { Input } from "@/components/ui/input"
import axios from "axios"

import { createUnderdogNft, createUnderdogProject, currencies, umi } from "@/lib/data"
import LoadingComponent from "@/components/upload/loading-compent";
import SuccessfulUploadComponent from "@/components/upload/success-component";
import { useToast } from "@/components/ui/use-toast"

import { createChallenge } from "@/actions/create-challenge"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { auth } from "@/auth";
import { useRouter } from 'next/navigation';
import { WalletButton } from "@/components/wallet/wallet-adapter";
import { transfer } from "@/lib/transfer";
import { useWallet } from "@solana/wallet-adapter-react";
import AdminLoginModal from "@/components/auth/admin-login-modal";
import AdminRegisterModal from "@/components/auth/admin-register-modal";
import { createMerkleTree } from "@/lib/merkelTree";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import ConfirmModalComponent from "@/components/general/confirm-modal-component";
import { createNftCollection } from "@/lib/createNftCollection";
import { mintCnft } from "@/lib/mintCNFT";
import { getMetadataUrl } from "@/lib/getMetaDataUrl";
import { hideTransferLoader, showTransferLoader } from "@/lib/helper";

const UploadForm = () => {
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [openConfirmMintModal, setOpenConfirmMintModal] = useState(false);
    const [openPromptConnectWallet, setOpenPromptConnectWallet] = useState(false);
    
    const [openAdminAuthModal,setOpenAdminAuthModal] = useState(false);
    const [openAdminLoginModal,setOpenAdminLoginModal] = useState(false);
    const [openAdminRegisterModal,setOpenAdminRegisterModal] = useState(false);
    const [currentRate, setCurrentRate] = useState(null);
    const [transferring, setTransferring] = useState(false);
    

    const [transactionFee, setTransactionFee] = useState(null);
    const [transactionFeeSol, setTransactionFeeSol] = useState(null);
    const [totalCharge, setTotalCharge] = useState(null);
    const [totalChargeSol, setTotalChargeSol] = useState(null);

    
    const { toast } = useToast()
    const wallet = useWallet();    
    const router = useRouter();

    const { setVisible } = useWalletModal();

    const { 
        user, userLoggedIn,
        setChallengeTitle, challengeTitle,
        challengeTime, setChallengeTime, 
        challengeDate, setChallengeDate, 
        challengePrice, setChallengePrice, 
        challengeCurrency, setChallengeCurrency, 
        uploadedImage, setUploadedImage,
        challengeCurrencySymbol, setChallengeCurrencySymbol
    } = useContext(AppContext)

    useEffect(() => {
        console.log({publicKey: wallet.publicKey, connected: wallet.connected});
        
    }, [wallet.publicKey])

    const updateDate = (e: ChangeEvent<HTMLInputElement>) => {
        setChallengeDate(e.target.value)
    }

    const updateTitle = (e: ChangeEvent<HTMLInputElement>) => {
        setChallengeTitle(e.target.value)
    }

    const updateTime = (e: ChangeEvent<HTMLInputElement>) => {
        setChallengeTime(e.target.value)
    }

    const updateCurrency = (e: ChangeEvent<HTMLInputElement>) => {        
        let symbol = e.target.value;
        setChallengeCurrencySymbol(symbol)

        let selectedCurrency = currencies.find(currency => currency.symbol === symbol);

        if (selectedCurrency) {
            setChallengeCurrency(selectedCurrency.name)
            getCurrentRate(selectedCurrency.code)            
        }        
    }

    const transferFunds = async (charges) => {
        try {            
            let response = await transfer(wallet, charges);
            return true;
        } catch (error) {
            console.log(error);    
            return false;
        }
        
    }

    const getCurrentRate = (currency: string) => {
        let formatCurrency = currency.toLowerCase();
        const currencyMap: { [key: string]: string } = {
            eur: 'eur',
            cny: 'cny',
            gbp: 'gbp',
            ngn: 'ngn',
            usd: 'usd'
        };
    
        axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${formatCurrency}`)
            .then(res => {
                const rate = res.data.solana[currencyMap[formatCurrency]];
                setCurrentRate(rate);
            })
            .catch(err => console.log(err));  
    }

    const submitMetaData = async () => {

        const validate = validateMetaData();
        if (!validate) {
           return; 
        }                

        console.log("submitting data, auth user: ",{user});
        
        if (!userLoggedIn) {
            bringUpAdminLoginModal()
            return           
        }

        if (!wallet.connected) {            
            setOpenPromptConnectWallet(true)        
            return
        }

        setOpenConfirmModal(true);
    }

    const createTransaction = async (userId) => {
        let payload = {
            userId,
            transactionFee,
            transactionFeeSol,
            totalCharge,
            totalChargeSol,
            status: "SUCCESS"
        }

        try {
            let res = await axios.post("/api/auth/admin/transaction", payload)
            console.log(res);
            
        } catch (error) {
            console.log(error);            
        }
    }

    const proceedAfterConnectingWallet = async () => {
        const validate = validateMetaData();
        if (!validate) {
            return;
        }
        
        const local_user = localStorage.getItem('user');
        let auth_user = local_user ? JSON.parse(local_user) : user;

        try {
            showTransferLoader()

            let paid = await collectPayment()  
            if (!paid) {
                setTransferring(false)
                return;
            }


            // userId                
            // challengeId

            // Record transaction
            // const transaction = await createTransaction(auth_user.id)

            // CREATE PROJECT
            const underdogProject = await createUnderdogProject({
                name: challengeTitle,
                image: uploadedImage,
                symbol: "FB",
            });

            // let projectId = "3";
            let projectId = underdogProject?.data?.projectId.toString();
            if (!projectId) {
                toast({
                    title: "Could not create project",
                    description: "Could not create project",
                })
                return
            }


            const payload = {
                userId: auth_user.id,
                title: challengeTitle,
                image: uploadedImage,
                date: `${challengeDate}`,
                time: `${challengeTime}`,
                currency: challengeCurrency,
                symbol: challengeCurrencySymbol,
                price: challengePrice,
                type: "challenge",
                projectId: projectId,
                projectTransactionId: underdogProject?.data.transactionId,
                projectMintAddress: underdogProject?.data.mintAddress,
                nftId: "",
                nftTransactionId: ""
            }

            let challengeCreated = await saveChallengeToDatabase(payload, projectId)  
            console.log(challengeCreated);
            if (!challengeCreated?.challenge) {
                console.log("could not save to db");                
            }
            
            setTimeout(async () => {                
                // USE PROJECT TO CREATE NFT
                const underdogNft = await createUnderdogNft(payload, projectId, wallet.publicKey)
                console.log(underdogNft);
                if (!underdogNft) {
                    toast({
                        title: "Could not create NFT challenge",
                        description: "Could not create NFT challenge",
                    })
                    hideTransferLoader()
                    return;
                }

                let challenge_updated = await updateChallenge(
                    {
                        nftId: underdogNft?.data?.nftId.toString(),
                        nftTransactionId: underdogNft?.data?.transactionId
                    }, 
                    projectId
                )
                
                console.log(challenge_updated);
                router.push("/admin/challenges")

            }, 4000);
            
        } catch (error) {
            console.log(error);            
        }finally{
            hideTransferLoader()
        }
    }

    const mintCnft = async () => {
        try {
            showTransferLoader()
            
            const payload = {
                userId: user.id,
                title: challengeTitle,
                image: uploadedImage,
                date: challengeDate,
                time: challengeTime,
                currency: challengeCurrency,
                symbol: challengeCurrencySymbol,
                price: challengePrice,
                type: "challenge",
                projectId: projectId,
                projectTransactionId: transactionId,
                projectMintAddress: mintAddress
            }
    
            // USE PROJECT TO CREATE NFT
            const underdogNft = await createUnderdogNft(payload, projectId, wallet.publicKey)
            if (!underdogNft) {
                toast({
                    title: "Could not create NFT challenge",
                    description: "Could not create NFT challenge",
                })
                return;
            }
            console.log(underdogNft);
        } catch (error) {
            console.log(error);            
        }finally{
            hideTransferLoader()
        }
    }
    
    const collectPayment = async () => {
        if (!currentRate) {
            toast({
                title: "No current rate",
                description: "No Current rate",
            })
            return false;
        }

        // Calculate fee
        let percentage = 0.10; // 10% in decimal form
        let tenPercentFee = Number(challengePrice) * percentage; // save this as transaction_fee
        let fee = tenPercentFee / currentRate; // save this as transaction fee in SOL
        
        let amount = Number(challengePrice) / currentRate; // total charge 
        let charges = amount + fee // total charge in sol

        setTransactionFee(tenPercentFee)
        setTransactionFeeSol(fee)
        setTotalCharge(amount)
        setTotalChargeSol(charges)
        
        console.log({
            percentage,
            tenPercentFee,
            fee,
            amount,
            charges
        });

        try {
            // setTransferring(true)
            let transferred = await transferFunds(charges)

            if(!transferred){
                toast({
                    title: "Payment Error",
                    description: "Payment failed",
                })
                return false
            }
            
            return transferred;
        } catch (error) {
            console.log({transfer_response: error})
            toast({
                title: "Payment Error",
                description: "Payment failed",
            })
            return false
        }
    }

    const saveChallengeToDatabase = async (payload, projectId) => {
        try {
            const local_user = localStorage.getItem('user');
            let auth_user = local_user ? JSON.parse(local_user) : user;
                
            console.log(payload);
        
            const response = await axios.post("/api/auth/admin/challenge", payload)
            console.log(response);
            
            resetForm()
            return response;
        } catch (error) {
            console.log(error)
            toast({
                title: "Unable to create challenge",
                description: "Unable to create challenge",
            })
            return false
        }
    }

    const updateChallenge = async (payload, projectId) => {
        try {
            const local_user = localStorage.getItem('user');
            let auth_user = local_user ? JSON.parse(local_user) : user;
                
            console.log(payload, projectId);
            
            const response = await axios.put(`/api/auth/admin/challenge/${projectId}`, payload)
            console.log(response);
            // resetForm()
            return response;
        } catch (error) {
            console.log(error)
            toast({
                title: "Unable to update challenge",
                description: "Unable to update challenge",
            })
            return false
        }
    }

    const validateMetaData = () => {
        if (!uploadedImage) {
            toast({
                title: "No Image",
                description: "Kindly upload an image",
            })
            return false;
        }

        const validate_date = validateDateFormat(challengeDate)
        if (validate_date.error) {
            toast({
                title: "Invalid Date",
                description: validate_date.message,
            })
            return false;
        }
        
        const validate_date_time = validateDateTime(challengeDate, challengeTime)
        if (validate_date_time.error) {
            toast({
                title: "Invalid Time",
                description: validate_date_time.message,
            })
            return false;
        }

        if (challengePrice < 0) {
            toast({
                title: "Invalid Price",
                description: "Invalid Price",
            })
            return false;
        }

        return true;
    }

    function validateDateFormat(dateString: string) {
        const currentDate = new Date();
        const inputDate = new Date(dateString);
    
        if (inputDate.toString() === 'Invalid Date') {
            return { error: true, message: "Invalid date format" };
        }
    
        // Extract year, month, and day from current date
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // Month is 0-indexed
        const currentDay = currentDate.getDate();
    
        // Extract year, month, and day from input date
        const inputYear = inputDate.getFullYear();
        const inputMonth = inputDate.getMonth() + 1; // Month is 0-indexed
        const inputDay = inputDate.getDate();

        // Compare year, month, and day separately
        if (inputYear < currentYear || 
            (inputYear === currentYear && inputMonth < currentMonth) || 
            (inputYear === currentYear && inputMonth === currentMonth && inputDay < currentDay)) {
            return { error: true, message: "Date must be equal to or greater than the current day" };
        }
    
        return { error: false, message: "Date format is valid" };
    }

    const validateDateTime = (dateString: string, timeString: string) => {
        const current_date = new Date();
        const input_date_time = new Date(`${dateString}T${timeString}:00`);
    
        if (isNaN(input_date_time.getTime())) {
            return { error: true, message: "Invalid date or time format" };
        }
    
        if (input_date_time < current_date) {
            return { error: true, message: "Date and time cannot be in the past" };
        }
    
        return { error: false, message: "Date and time are valid" };
    }

    const bringUpAdminLoginModal = () => {
        // setOpenAdminAuthModal(false)
        let adminLoginModal = document.getElementById("admin-login-modal")
        if (adminLoginModal) {            
            adminLoginModal.style.display = "block";    
        }
    }

    
    const openWalletModal = () => {
        setOpenPromptConnectWallet(false)
        if(!wallet.connected){
            setVisible(true)
        }
    }

    const disconnectWallet = async () => {
        if(wallet.connected){
            let disconnect = await wallet.disconnect()
            console.log({disconnect});            
        }
    }

    const confirmPayBeforeCreate = () => {
        setOpenPromptConnectWallet(true)
    }

    const resetForm = () => {
        setChallengeTitle(null)
        setChallengeTime(null)
        setChallengeDate(null)
        setChallengePrice(null)
        setUploadedImage(null)
    }  

    return (
        <>
            <div className="mb-4">
                <label htmlFor="date" className='text-sm text-white'>Title</label>
                <Input type="text" onChange={updateTitle} className=' rounded-xl mt-1 w-full bg-white  border-none outline-none text-xs' />
            </div>

            <div className='mb-4 grid grid-cols-2 gap-5'>
                <div>
                    <label htmlFor="date" className='text-sm text-white'>Date</label>
                    <Input type="date" onChange={updateDate} className=' rounded-xl mt-1 w-full bg-white  border-none outline-none text-xs' />
                </div>
                <div>
                    <label htmlFor="time" className='text-sm text-white'>Time</label>
                    <Input type="time" onChange={updateTime} className=' rounded-xl mt-1 w-full bg-white  border-none outline-none text-xs' />
                </div>
            </div>

            <div className='mb-4 grid grid-cols-2 gap-5'>

                <div className="">
                    <label htmlFor="currency" className='text-sm text-white'>Currency</label>
                    <div className="mt-1 px-3 py-1 bg-white rounded-lg">
                        <select name="currency" onChange={updateCurrency} className="w-full text-xs outline-none" id="">
                            <option disabled defaultValue={currencies[0].symbol}>Currency</option>
                            { 
                                currencies.map((currency, key) => (
                                    <option key={key} value={currency.symbol}>
                                        {currency.name} - {currency.symbol}
                                    </option>
                                ))
                            }
                        
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="bounty" className='text-sm text-white'>Bounty Price</label>
                    <Input type="number" onKeyUp={(e) => setChallengePrice(e.target.value)} className='bg-white p-3 rounded-xl mt-1 w-full outline-none text-xs'/>

                </div>
            </div>

            {
                wallet?.connected && 
                <Button onClick={submitMetaData}>
                    { (challengeCurrency && challengePrice) && `${challengeCurrencySymbol} ${challengePrice} - `} Pay & Post
                </Button>
            }

            { !wallet?.connected && <Button onClick={submitMetaData}>Proceed</Button> }

            {/* MODALS HERE */}

            <ConfirmModalComponent 
            confirmProcess={proceedAfterConnectingWallet} 
            openConfirmModal={openConfirmModal} 
            setOpenConfirmModal={setOpenConfirmModal}
            title="Confirm Payment" 
            subtitle="Disclaimer: We would never share your credentials with anyone"
            buttonText="Pay"
            />
            <ConfirmModalComponent 
            confirmProcess={mintCnft} 
            openConfirmModal={openConfirmMintModal} 
            setOpenConfirmModal={setOpenConfirmMintModal}
            title="Confirm Mint" 
            subtitle="Mint your NFT"
            buttonText="Mint"
            />

            <AlertDialog open={openPromptConnectWallet} onOpenChange={setOpenPromptConnectWallet}>
                {/* <AlertDialogTrigger className="w-full bg-black p-3 text-white rounded-xl">Create</AlertDialogTrigger> */}
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kindly connect to a wallet for payment</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            Disclaimer: We would never share your secret credentials with anyone
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        { !wallet.connected && <AlertDialogAction onClick={openWalletModal}>Connect Wallet</AlertDialogAction>}
                        {/* { wallet.connected && <AlertDialogAction onClick={disconnectWallet}>Disconnect Wallet</AlertDialogAction>} */}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <AlertDialog open={openAdminAuthModal} onOpenChange={setOpenAdminAuthModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Login or Register</AlertDialogTitle>
                        <AlertDialogDescription>
                            We need to identify who you are
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <div className="flex justify-between gap-5 w-full">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={bringUpAdminLoginModal} className="w-full" >Login</AlertDialogAction>
                            <AlertDialogAction className="w-full" >Register</AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            
            {/* <AdminLoginModal /> */}
            {/* <AdminRegisterModal /> */}
            {/* <FullPageLoader /> */}
        </>
    );
}

export default UploadForm