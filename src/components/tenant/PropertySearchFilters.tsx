import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { LocationArea, SearchFilterState } from '../../types';
import { TouchSelect } from '../common/TouchSelect';
import { STANDARD_UYO_AREAS } from '../../config/platform';

interface PropertySearchFiltersProps {
  filters: SearchFilterState;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilterState>>;
  locations: LocationArea[];
  onSearch: () => void;
  onReset: () => void;
}

export const PropertySearchFilters: React.FC<PropertySearchFiltersProps> = ({
  filters,
  setFilters,
  locations,
  onSearch,
  onReset,
}) => {
  // Available cities from location data
  const rawCities = locations.filter((l) => l.isActive).map((l) => l.city).filter(Boolean);
  const availableCities = Array.from(new Set(rawCities.length > 0 ? rawCities : ['Uyo']));

  // Active locations filtered by selected city, unified with STANDARD_UYO_AREAS for Uyo
  const isUyoSelected = !filters.city || filters.city === 'All Cities' || filters.city.toLowerCase() === 'uyo';
  const dynamicLocationNames = locations
    .filter((l) => l.isActive)
    .filter((l) => filters.city === 'All Cities' || l.city.toLowerCase() === filters.city.toLowerCase())
    .map((l) => l.name);

  const unifiedAreaNames = Array.from(
    new Set([
      ...(isUyoSelected ? STANDARD_UYO_AREAS : []),
      ...dynamicLocationNames,
    ])
  );

  const currentBedroomsValue =
    filters.bedrooms?.toLowerCase() === 'all' ? 'all' : filters.bedrooms || 'all';

  const cityOptions = [
    { value: 'All Cities', label: 'All Cities' },
    ...availableCities.map((cityName) => ({ value: cityName, label: cityName })),
  ];

  const areaOptions = [
    { value: 'All Areas', label: 'All Neighbourhoods' },
    ...unifiedAreaNames.map((areaName) => ({ value: areaName, label: areaName })),
  ];

  const propertyTypeOptions = [
    { value: 'All Types', label: 'All Property Types' },
    { value: 'Self-contained', label: 'Self-contained' },
    { value: 'Room and parlour', label: 'Room and parlour' },
    { value: '1-bedroom', label: '1 Bedroom' },
    { value: '2-bedroom', label: '2 Bedroom' },
    { value: '3-bedroom', label: '3 Bedroom' },
    { value: '4-bedroom', label: '4 Bedroom' },
    { value: '5+ bedroom', label: '5+ Bedroom' },
    { value: 'Flat', label: 'Flat' },
    { value: 'Duplex', label: 'Duplex' },
    { value: 'Detached house', label: 'Detached house' },
    { value: 'Semi-detached house', label: 'Semi-detached house' },
    { value: 'Full compound', label: 'Full Compound' },
    { value: 'Shared apartment', label: 'Shared apartment' },
    { value: 'Other', label: 'Other' },
  ];

  const bedroomOptions = [
    { value: 'all', label: 'Any Bedrooms' },
    { value: '1', label: '1 Bedroom' },
    { value: '2', label: '2 Bedrooms' },
    { value: '3', label: '3 Bedrooms' },
    { value: '4', label: '4 Bedrooms' },
    { value: '5+', label: '5+ Bedrooms' },
  ];

  const minPriceOptions = [
    { value: 0, label: 'No Min Price' },
    { value: 300000, label: '₦300,000' },
    { value: 500000, label: '₦500,000' },
    { value: 800000, label: '₦800,000' },
    { value: 1000000, label: '₦1,000,000' },
    { value: 1200000, label: '₦1,200,000' },
    { value: 1500000, label: '₦1,500,000' },
    { value: 2000000, label: '₦2,000,000' },
    { value: 3000000, label: '₦3,000,000' },
    { value: 5000000, label: '₦5,000,000' },
  ];

  const maxPriceOptions = [
    { value: 100000000, label: 'No Max Price' },
    { value: 500000, label: '₦500,000' },
    { value: 800000, label: '₦800,000' },
    { value: 1000000, label: '₦1,000,000' },
    { value: 1500000, label: '₦1,500,000' },
    { value: 2000000, label: '₦2,000,000' },
    { value: 2500000, label: '₦2,500,000' },
    { value: 3500000, label: '₦3,500,000' },
    { value: 5000000, label: '₦5,000,000' },
    { value: 10000000, label: '₦10,000,000' },
  ];

  return (
    <div id="search-filter-panel" className="bg-white rounded-2xl p-5 sm:p-7 shadow-md border border-stone-200 relative z-20">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 text-stone-900 font-bold text-lg sm:text-xl">
          <Filter className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>
            {filters.city && filters.city !== 'All Cities'
              ? `Find Homes & Apartments in ${filters.city}`
              : 'Find Verified Homes & Apartments'}
          </span>
        </div>
        <button
          id="btn-clear-filters-top"
          type="button"
          onClick={onReset}
          className="text-sm sm:text-base font-semibold text-stone-600 hover:text-red-600 flex items-center gap-1.5 transition py-2 px-3 rounded-lg hover:bg-stone-100 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Clear Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. City / Town */}
        <TouchSelect
          id="filter-city"
          label="City / Town"
          value={filters.city}
          options={cityOptions}
          onChange={(newCity) => {
            setFilters((prev) => ({
              ...prev,
              city: newCity,
              area: 'All Areas', // Reset area when city changes
            }));
          }}
        />

        {/* 2. Area / Neighbourhood */}
        <TouchSelect
          id="filter-area"
          label="Area / Neighbourhood"
          value={filters.area}
          options={areaOptions}
          onChange={(newArea) => setFilters((prev) => ({ ...prev, area: newArea }))}
        />

        {/* 3. Property Type */}
        <TouchSelect
          id="filter-property-type"
          label="Property Type"
          value={filters.propertyType}
          options={propertyTypeOptions}
          onChange={(newType) => setFilters((prev) => ({ ...prev, propertyType: newType }))}
        />

        {/* 4. Number of Bedrooms */}
        <TouchSelect
          id="filter-bedrooms"
          label="Bedrooms"
          value={currentBedroomsValue}
          options={bedroomOptions}
          onChange={(newBedrooms) => setFilters((prev) => ({ ...prev, bedrooms: newBedrooms }))}
        />

        {/* 5. Min Price */}
        <TouchSelect
          id="filter-min-price"
          label="Min Price (₦)"
          value={filters.minPrice}
          options={minPriceOptions}
          onChange={(newMin) => setFilters((prev) => ({ ...prev, minPrice: Number(newMin) }))}
        />

        {/* 6. Max Price */}
        <TouchSelect
          id="filter-max-price"
          label="Max Price (₦)"
          value={filters.maxPrice}
          options={maxPriceOptions}
          onChange={(newMax) => setFilters((prev) => ({ ...prev, maxPrice: Number(newMax) }))}
        />
      </div>

      {/* Prominent Search Properties Button & Bottom Clear Filters */}
      <div className="mt-6 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          id="btn-clear-filters-bottom"
          type="button"
          onClick={onReset}
          className="text-base font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-2 transition py-2.5 px-3 rounded-lg hover:bg-stone-100 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Filters</span>
        </button>

        <button
          id="btn-main-search-properties"
          type="button"
          onClick={onSearch}
          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-base px-8 py-3.5 rounded-xl transition flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
        >
          <Search className="w-5 h-5" />
          <span>Search Properties</span>
        </button>
      </div>
    </div>
  );
};


