import { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Check, X, Loader2 } from "lucide-react";
import type { Producto } from "../api/types";

interface SearchableProductSelectProps {
  products: Producto[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableProductSelect({
  products,
  selectedProductId,
  onSelect,
  placeholder = "Escribe el nombre o SKU para buscar...",
  disabled = false,
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Sync input value with selected product when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      if (selectedProduct) {
        setInputValue(`${selectedProduct.sku} · ${selectedProduct.nombre}`);
      } else {
        setInputValue("");
      }
      setDebouncedTerm("");
      setIsDebouncing(false);
    }
  }, [selectedProduct, isOpen]);

  // 1-second debounce effect when typing as requested
  useEffect(() => {
    if (!isOpen) return;

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(inputValue.trim());
      setIsDebouncing(false);
    }, 1000); // 1000ms delay

    return () => clearTimeout(timer);
  }, [inputValue, isOpen]);

  // Filter products based on debounced term
  const filteredProducts = useMemo(() => {
    if (!debouncedTerm) {
      return products.slice(0, 30);
    }
    const term = debouncedTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term)) ||
        (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(term))
    );
  }, [products, debouncedTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (prod: Producto) => {
    onSelect(prod.id);
    setInputValue(`${prod.sku} · ${prod.nombre}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    setDebouncedTerm("");
    inputRef.current?.focus();
  };

  return (
    <div className="searchable-select-wrap" ref={containerRef}>
      <div
        className={`searchable-select-box ${isOpen ? "open" : ""} ${
          disabled ? "disabled" : ""
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search size={16} className="searchable-icon-search" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setDebouncedTerm(inputValue.trim());
              setIsDebouncing(false);
              if (filteredProducts.length > 0) {
                handleSelect(filteredProducts[0]);
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="searchable-input"
        />

        {isDebouncing ? (
          <div className="searchable-spinner" title="Buscando producto (1s)...">
            <Loader2 size={15} className="animate-spin text-forest" />
          </div>
        ) : inputValue && isOpen ? (
          <button
            type="button"
            className="searchable-clear"
            onClick={handleClear}
            title="Limpiar texto"
          >
            <X size={14} />
          </button>
        ) : null}

        <ChevronDown
          size={16}
          className={`searchable-arrow ${isOpen ? "rotate" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="searchable-dropdown">
          <div className="searchable-header-hint">
            {isDebouncing ? (
              <span className="searchable-status-debouncing">
                <Loader2 size={12} className="animate-spin" /> Esperando que termines de escribir (1s)...
              </span>
            ) : debouncedTerm ? (
              <span>
                Resultados para <strong>"{debouncedTerm}"</strong> ({filteredProducts.length})
              </span>
            ) : (
              <span>Escribe para buscar en el catálogo ({products.length} productos)</span>
            )}
          </div>

          <div className="searchable-list">
            {filteredProducts.length === 0 ? (
              <div className="searchable-empty">
                No se encontraron productos para "{debouncedTerm}"
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    className={`searchable-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(p)}
                  >
                    <div className="searchable-item-info">
                      <div className="searchable-item-title">
                        <span className="searchable-item-sku">{p.sku}</span>
                        <span className="searchable-item-name">{p.nombre}</span>
                      </div>
                      <div className="searchable-item-meta">
                        {p.categoria?.nombre && (
                          <span className="searchable-item-cat">
                            {p.categoria.nombre}
                          </span>
                        )}
                        {p.unidadMedida?.simbolo && (
                          <span>Und: {p.unidadMedida.simbolo}</span>
                        )}
                        {(p.manejaLotes || p.maneja_lotes) && (
                          <span className="searchable-item-lote">Lotes</span>
                        )}
                      </div>
                    </div>
                    <div className="searchable-item-price">
                      <strong>S/ {Number(p.precioVenta || 0).toFixed(2)}</strong>
                      {isSelected && <Check size={16} className="text-forest" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
