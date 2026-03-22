import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CollegeDropdownProps {
  selectedCollege: string;
  onSelect: (college: string) => void;
}

const colleges = ["Anurag University", "CVR College of Engineering", "Other College 1", "Other College 2"];

export const CollegeDropdown: React.FC<CollegeDropdownProps> = ({ selectedCollege, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-zinc-700 shadow-sm px-4 py-2 bg-zinc-800 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedCollege}
          <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-zinc-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1">
            {colleges.map((college) => (
              <button
                key={college}
                className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700"
                onClick={() => {
                  onSelect(college);
                  setIsOpen(false);
                }}
              >
                {college}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
