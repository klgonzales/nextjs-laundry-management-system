import { MdLocationOn, MdEmail, MdPhone } from "react-icons/md";

export default function Footer() {
  return (
    <footer className="text-gray-400 p-2 text-center text-xs font-thin fixed bottom-0 w-full bg-white">
      <div className="flex items-center justify-center space-x-4">
        <p>&copy; {new Date().getFullYear()} Elbi Wash. All rights reserved.</p>

        <div className="flex items-center space-x-2">
          <MdEmail />
          <p>contact@ics.uplb.edu.ph</p>
        </div>
        <div className="flex items-center space-x-2">
          <MdPhone />
          <p>(02) 123 4567 890</p>
        </div>
      </div>
    </footer>
  );
}
