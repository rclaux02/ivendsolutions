import React from "react";

interface ErrorModalProps {
  mensaje: string;
  abierto: boolean;
  onReintentar: () => void;
  textoBoton?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  mensaje,
  abierto,
  onReintentar,
  textoBoton = "Cerrar",
}) => {
  if (!abierto) return null;

  // Si el mensaje es el de Arduino, mostrar sin estilos
  if (mensaje.includes('Arduino not connected')) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div>
          <pre style={{
            background: 'none',
            color: 'black',
            fontSize: 16,
            border: 'none',
            padding: 0,
            margin: 0,
            fontFamily: 'inherit',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            boxShadow: 'none',
          }}>{mensaje}</pre>
          <button onClick={onReintentar} style={{
            marginTop: '1rem',
            background: 'none',
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
          }}>
            {textoBoton}
          </button>
        </div>
      </div>
    );
  }

  // Modal normal estilizado
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
      zIndex: 1000
    }}>
      <div style={{
        background: '#FF4747',
        padding: '2rem 2.5rem',
        borderRadius: '16px',
        minWidth: '340px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {/* Icono de advertencia */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto',
        }}>
          <span style={{
            color: '#fff',
            fontSize: 32,
            fontWeight: 'bold',
            lineHeight: 1,
            userSelect: 'none',
          }}>!</span>
        </div>
        <h2 style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 22,
          margin: '0 0 0.5rem 0',
          letterSpacing: 1,
        }}>Error</h2>
        <p style={{
          color: '#fff',
          fontSize: 16,
          margin: '0 0 1.5rem 0',
        }}>{mensaje}</p>
        <button onClick={onReintentar} style={{
          width: '100%',
          padding: '0.75rem 0',
          border: 'none',
          borderRadius: '8px',
          background: '#fff',
          color: '#FF4747',
          fontWeight: 700,
          fontSize: 16,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'background 0.2s',
        }}>
          {textoBoton}
        </button>
      </div>
    </div>
  );
};

export default ErrorModal; 