import React, { useState, useEffect, useRef } from 'react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  value: string;
  onChange: (value: string, lat: number, lon: number) => void;
  placeholder?: string;
}

export default function LocationSearch({ value, onChange, placeholder = 'Search for a place…' }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const shortName = result.display_name.split(',').slice(0, 3).join(',');
    setQuery(shortName);
    setOpen(false);
    setResults([]);
    onChange(shortName, parseFloat(result.lat), parseFloat(result.lon));
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        {loading && (
          <div className="absolute right-2.5 top-2.5">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.place_id}
              onMouseDown={() => handleSelect(r)}
              className="px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              <span className="font-medium">{r.display_name.split(',')[0]}</span>
              <span className="text-gray-400 text-xs ml-1">
                {r.display_name.split(',').slice(1, 3).join(',')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
