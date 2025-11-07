import React, { useState } from 'react';

interface LicenseModalProps {
  isOpen: boolean;
  onSuccess: (code: string) => void;
}

// Custom Virtual Keyboard Component
const VirtualKeyboard: React.FC<{
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  disabled?: boolean;
}> = ({ value, onChange, maxLength, disabled = false }) => {
  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y', 'Z', '⌫', '✓']
  ];

  const handleKeyPress = (key: string) => {
    if (disabled) return;
    
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '✓') {
      // Submit action handled by parent
      return;
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <div style={{
      width: '100%',
      marginBottom: 16
    }}>
      {/* Display the current value */}
      <div style={{
        width: '100%',
        padding: '1rem',
        border: '2px solid #454eff',
        borderRadius: 12,
        fontSize: 20,
        fontWeight: 600,
        textAlign: 'center',
        background: '#f8f9fa',
        color: '#333',
        marginBottom: 16,
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '2px'
      }}>
        {value || 'Ingresa tu licencia'}
      </div>

      {/* Virtual Keyboard */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {keys.map((row, rowIndex) => (
          <div key={rowIndex} style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center'
          }}>
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                disabled={disabled}
                style={{
                  width: key === '⌫' || key === '✓' ? '80px' : '50px',
                  height: '50px',
                  border: 'none',
                  borderRadius: 8,
                  background: key === '⌫' ? '#ff6b6b' : key === '✓' ? '#51cf66' : '#454eff',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: disabled ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none'
                }}
                onMouseDown={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onSuccess }) => {
  const [license, setLicense] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (license.length === 0) return;
    
    setError(null);
    setLoading(true);
    try {
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke('license:validate', license);
      if (result.success && result.code) {
        onSuccess(result.code);
      } else {
        setError(result.error || 'Licencia inválida');
      }
    } catch (err) {
      setError('Error de comunicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        padding: '2rem 2.5rem',
        borderRadius: '16px',
        minWidth: '400px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ color: '#222', fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Ingresa Licencia</h2>
        
        {/* Virtual Keyboard Component */}
        <VirtualKeyboard
          value={license}
          onChange={setLicense}
          maxLength={12}
          disabled={loading}
        />
        
        {error && <div style={{ color: '#FF4747', marginBottom: 12, fontSize: 14 }}>{error}</div>}
        
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem 0',
            border: 'none',
            borderRadius: '8px',
            background: '#454eff',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
            opacity: loading ? 0.7 : 1
          }}
          disabled={loading || license.length === 0}
        >
          {loading ? 'Validando...' : 'Validar'}
        </button>
      </form>
    </div>
  );
};

export default LicenseModal; 