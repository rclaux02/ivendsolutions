import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterCategory {
  name: string;
  options: FilterOption[];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (selectedFilters: Record<string, string[]>) => void;
  initialFilters?: Record<string, string[]>;
  filterCategories?: FilterCategory[];
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  initialFilters = {
    Marcas: [],
    Puffs: [],
    Precio: [],
  },
  filterCategories: externalFilterCategories
}) => {
  // Default filter categories if not provided externally
  const defaultFilterCategories: FilterCategory[] = [
    {
      name: 'Marcas',
      options: [
        { id: 'Elfbar', label: 'Elfbar' },
        { id: 'Life Pod', label: 'Life Pod' },
        { id: 'VaporTech', label: 'VaporTech' },
        { id: 'FrostVape', label: 'FrostVape' },
        { id: 'CloudKing', label: 'CloudKing' },
        { id: 'TropicalVape', label: 'TropicalVape' },
      ],
    },
    {
      name: 'Puffs',
      options: [
        { id: '40000+', label: '40,000+' },
        { id: '30000-40000', label: '30,000 - 40,000' },
        { id: '20000-30000', label: '20,000 - 30,000' },
        { id: '10000-20000', label: '10,000 - 20,000' },
        { id: '1000-10000', label: '1,000 - 10,000' },
      ],
    },
    {
      name: 'Precio',
      options: [
        { id: '150+', label: '150+ soles' },
        { id: '100-150', label: '100 - 150 soles' },
        { id: '50-100', label: '50 - 100 soles' },
        { id: '0-50', label: '0 - 50 soles' },
      ],
    },
  ];

  // Use provided filter categories or fall back to default
  const filterCategories = externalFilterCategories || defaultFilterCategories;

  // State for selected filters
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(initialFilters);

  // State for modal animation
  const [modalVisible, setModalVisible] = useState(false);

  // Update selected filters when initialFilters changes
  useEffect(() => {
    if (isOpen) {
      setSelectedFilters(initialFilters);
    }
  }, [isOpen, initialFilters]);

  // Handle modal open/close with animation
  useEffect(() => {
    if (isOpen) {
      // First make the backdrop visible immediately
      setModalVisible(true);
    } else {
      // Delay hiding the modal to allow for animation
      const timer = setTimeout(() => {
        setModalVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Toggle filter selection
  const toggleFilter = (category: string, optionId: string) => {
    setSelectedFilters(prev => {
      const currentSelected = [...prev[category]];
      const index = currentSelected.indexOf(optionId);
      
      if (index === -1) {
        // Add to selection
        return { ...prev, [category]: [...currentSelected, optionId] };
      } else {
        // Remove from selection
        currentSelected.splice(index, 1);
        return { ...prev, [category]: currentSelected };
      }
    });
  };

  // Apply filters and close modal
  const handleApplyFilters = () => {
    onApplyFilters(selectedFilters);
    onClose();
  };

  // Clear all filters
  const clearFilters = () => {
    // Create an empty filter object based on the current filter categories
    const emptyFilters: Record<string, string[]> = {};
    filterCategories.forEach(category => {
      emptyFilters[category.name] = [];
    });
    setSelectedFilters(emptyFilters);
  };

  // Check if an option is selected
  const isSelected = (category: string, optionId: string) => {
    return selectedFilters[category].includes(optionId);
  };

  if (!modalVisible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div className="relative flex flex-col items-center w-full px-[120px]">
        <div 
          className={`bg-white rounded-xl w-full p-[20px] transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-[70px]">
            <h2 className="text-black text-[32px] font-[800] font-akira">FILTROS</h2>
            <button 
              onClick={clearFilters}
              className="text-black text-[18px] font-[600] font-inter hover:text-gray-600"
            >
              Limpiar
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-8">
            {filterCategories.map((category) => (
              <div key={category.name}>
                <h3 className="text-black text-[20px] font-[800] mb-4">{category.name}</h3>
                <div className="space-y-[24px]">
                  {category.options.map((option) => (
                    <div 
                      key={option.id}
                      onClick={() => toggleFilter(category.name, option.id)}
                      className={`py-[10px] px-[10px] rounded-[6px] cursor-pointer transition-colors ${
                        isSelected(category.name, option.id) 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-[20px] font-[500]">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Search Button */}
          <div className="mt-8 mb-2">
            <button 
              className="w-full bg-blue-600 text-white text-[18px] font-semibold py-[16px] rounded-[6px] hover:bg-blue-700 transition-colors"
              onClick={handleApplyFilters}
            >
              Buscar
            </button>
          </div>
        </div>
        
        {/* Close Button - Floating below the modal */}
        <button 
          onClick={onClose}
          className="absolute top-full mt-[30px] bg-white rounded-full h-[60px] w-[60px] flex items-center justify-center transition-transform hover:scale-110"
          aria-label="Close filter modal"
        >
          <X size={30} className="text-black" />
        </button>
      </div>
    </div>
  );
};

export default FilterModal; 