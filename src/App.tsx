import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import Index from "@/pages/Index";
import Menu from "@/pages/Menu";
import PratosDoDia from "@/pages/PratosDoDia";
import Especialidades from "@/pages/Especialidades";
import Contactos from "@/pages/Contactos";
import Sobre from "@/pages/Sobre";
import NotFound from "@/pages/NotFound";

import LoginPage from "@/pages/LoginPage";

import AdminPedidos from "@/pages/AdminPedidos";
import { AdminRoute } from "./components/AdminRoute";

import AccountIndex from "@/pages/account";
import ProfilePage from "@/pages/account/ProfilePage";
import OrderHistoryPage from "@/pages/account/OrderHistoryPage";
import { AccountRoute } from "@/components/account/AccountRoute";
import RegisterPage from "./pages/account/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from './pages/ResetPasswordPage';


const queryClient = new QueryClient();

class Router {
}

let router: Router;
// @ts-ignore
router = createBrowserRouter(
    [
        // Público
        {path: "/", element: <Index/>},
        {path: "/pratos-do-dia", element: <PratosDoDia/>},
        {path: "/especialidades", element: <Especialidades/>},
        {path: "/contactos", element: <Contactos/>},
        {path: "/sobre", element: <Sobre/>},
        {path: "/registro", element: <RegisterPage/>},
        {path: "/forgot-password", element: <ForgotPasswordPage/>},
        {path: "/reset-password", element: <ResetPasswordPage/>},


        // Login único
        {path: "/login", element: <LoginPage/>},

        // Área do cliente
        {
            path: "/account",
            element: (
                <AccountRoute>
                    <AccountIndex/>
                </AccountRoute>
            ),
            children: [
                {index: true, element: <ProfilePage/>},
                {path: "orders", element: <OrderHistoryPage/>},
            ],
        },

        // Admin
        {
            path: "/admin/pedidos",
            element: (
                <AdminRoute>
                    <AdminPedidos/>
                </AdminRoute>
            ),
        },

        // 404
        {path: "*", element: <NotFound/>},
    ],
    {
        future: {v7_relativeSplatPath: true},
    }
);

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <CartProvider>
                    <TooltipProvider>
                        <Toaster/>
                        <Sonner/>
                        <RouterProvider router={router}/>
                    </TooltipProvider>
                </CartProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App
