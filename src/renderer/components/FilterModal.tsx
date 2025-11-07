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
  machineCode?: string; // Código de la máquina actual
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  initialFilters = {
    Categoria: [],
    Marca: [],
    Precio: [],
  },
  filterCategories: externalFilterCategories,
  machineCode = '000003' // Default machine code
}) => {
  // Default filter categories - all empty, will be populated from database
  const defaultFilterCategories: FilterCategory[] = [
    {
      name: 'Categoria',
      options: [
        { id: 'Bebidas', label: 'Bebidas' },
        { id: 'Caramelos', label: 'Caramelos' },
        { id: 'Chocolates', label: 'Chocolates' },
        { id: 'Cigarros', label: 'Cigarros' },
        { id: 'Galletas', label: 'Galletas' },
        { id: 'Snacks', label: 'Snacks' },
      ]
    },
    {
      name: 'Marca',
      options: [] // Will be populated from database
    },
    {
      name: 'Precio',
      options: [
        { id: '0-2', label: '0 - 2 soles' },
        { id: '2-5', label: '2 - 5 soles' },
        { id: '5-10', label: '5 - 10 soles' },
        { id: '10+', label: '10+ soles' },
      ],
    },
  ];

  // State for selected filters
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(initialFilters);

  // Use provided filter categories (which includes dynamic brands and categories) or fall back to default
  let filterCategories = externalFilterCategories || defaultFilterCategories;
  
  // Debug log to see what we're receiving
  console.log('[FilterModal] Received externalFilterCategories:', externalFilterCategories);
  console.log('[FilterModal] Using filterCategories:', filterCategories);
  
  // State for modal animation
  const [modalVisible, setModalVisible] = useState(false);

  // Remove this useEffect that tries to load categories from DB
  // useEffect(() => {
  //   if (isOpen && machineCode) {
  //     loadCategoriesForMachine(machineCode);
  //   }
  // }, [isOpen, machineCode]);

  // Remove the loadCategoriesForMachine function entirely
  // const loadCategoriesForMachine = async (machineCode: string) => {
  //   try {
  //     console.log('Cargando categorías para máquina:', machineCode);
  //     const categories = await window.electronAPI.invoke('filters:get-categories-by-machine', machineCode);
  //     setDbCategories(categories);
  //   } catch (error) {
  //     console.error('Error cargando categorías para máquina', machineCode, ':', error);
  //   }
  // };

  // Remove this logic that overwrites categories
  // // SIEMPRE usar las categorías de la BD para la máquina específica
  // if (dbCategories.length > 0) {
  //   filterCategories = [
  //     {
  //       name: 'Categoria',
  //       options: dbCategories.map(cat => ({ id: cat, label: cat }))
  //     },
  //     ...defaultFilterCategories.slice(1) // Mantener Marca y Precio
  //   ];
  //   console.log('✅ Usando categorías de BD para máquina', machineCode, ':', dbCategories);
  // } else {
  //   console.log('⚠️ No hay categorías de BD, usando categorías por defecto');
  // }

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
            <h2 className="text-black text-[32px] font-[800] font-akira">Filtros</h2>
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