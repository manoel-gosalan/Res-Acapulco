import { Outlet } from "react-router-dom";

export default function AccountLayout() {
  return (
    <div className="min-h-screen p-4">
      {/* header / menu lateral do cliente */}
      <Outlet />
    </div>
  );
}
