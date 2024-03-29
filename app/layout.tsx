import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";
import "./css/layout.css";
import "./css/user.css";
import "./css/home-animation.css"

import { StoryContext } from '@/context/StoryContext' 
import { Toaster } from "@/components/ui/toaster"
import { WalletContextProvider } from "@/components/wallet/wallet-adapter";
import MenuComponent from "@/components/general/menu-component";
import { auth } from "@/auth";
import fetchUser from "@/lib/fetchUser";
import AdminRegisterModal from "@/components/auth/admin-register-modal";
import AdminLoginModal from "@/components/auth/admin-login-modal";
import FullPageLoader from "@/components/general/full-page-loader";
import UserRegisterModal from "@/components/auth/user-register.modal";
import UserLoginModal from "@/components/auth/user-login-modal";
const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["100", "200", "300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // const session = await auth();
  const user = await fetchUser()   

  return (
    <html lang="en">
      <head>
        <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet' />
      </head>
      <body className={poppins.className}>
        <WalletContextProvider>
          <StoryContext user={user}>
            {children}
            <MenuComponent />

            <AdminRegisterModal />
            <UserRegisterModal />
            <UserLoginModal />
            <AdminLoginModal />
          </StoryContext>  
        </WalletContextProvider>


        <Toaster />
        <FullPageLoader />

      </body>
    </html>
  );
}
