import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

/**
 * Search box + sort select. Both live in the URL (?q=, ?sort=) so a filtered
 * view can be shared and survives the back button.
 */
function SearchSort() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || '';
  const [q, setQ] = useState(urlQ);
  const timer = useRef(null);

  // Keep the box in sync when the URL changes from elsewhere (Clear all, back button).
  useEffect(() => { setQ(urlQ); }, [urlQ]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };

  const onType = (value) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update('q', value.trim()), 200);
  };

  return (
    <div className="flex gap-2 md:gap-3 mb-3 md:mb-5">
      <label className="relative flex-1 min-w-0">
        <span className="sr-only">Search pieces</span>
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
        <input
          type="search"
          value={q}
          onChange={(e) => onType(e.target.value)}
          placeholder="Search brand, style, size…"
          enterKeyHint="search"
          className="w-full rounded-minimal border border-neutral-light-beige bg-neutral-white py-2.5 pl-9 pr-3 text-sm text-text-dark placeholder:text-text-light focus:border-accent-brown focus:outline-none"
        />
      </label>
      <label className="flex-shrink-0">
        <span className="sr-only">Sort by</span>
        <select
          value={sort}
          onChange={(e) => update('sort', e.target.value)}
          className="h-full rounded-minimal border border-neutral-light-beige bg-neutral-white px-2.5 md:px-3 text-sm text-text-dark focus:border-accent-brown focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}

export default function ShopFilters({ categories = [], badges = [], sizes = [] }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Get all selected categories from URL (supports multiple)
  const selectedCategories = searchParams.getAll('category');
  const selectedGenders = searchParams.getAll('gender');
  const selectedBadges = searchParams.getAll('badge');
  const isAllCategoriesSelected = selectedCategories.length === 0;
  const isAllGenderSelected = selectedGenders.length === 0;
  const isAllBadgesSelected = selectedBadges.length === 0;
  const selectedSizes = searchParams.getAll('size');

  // Build URL with combined params. Search, sort and size ride along untouched.
  const buildUrl = (newCategories, newGenders, newBadges) => {
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    params.delete('gender');
    params.delete('badge');
    (newCategories || []).forEach((cat) => params.append('category', cat));
    (newGenders || []).forEach((g) => params.append('gender', g));
    (newBadges || []).forEach((b) => params.append('badge', b));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : '/shop';
  };

  // Handle category toggle
  const handleCategoryToggle = (slug) => {
    let newCategories;
    if (selectedCategories.includes(slug)) {
      newCategories = selectedCategories.filter((cat) => cat !== slug);
    } else {
      newCategories = [...selectedCategories, slug];
    }
    navigate(buildUrl(newCategories, selectedGenders, selectedBadges));
  };

  // Gender is multi-select too: tap Men and Women to see both.
  const handleGenderToggle = (gender) => {
    const newGenders = selectedGenders.includes(gender)
      ? selectedGenders.filter((g) => g !== gender)
      : [...selectedGenders, gender];
    navigate(buildUrl(selectedCategories, newGenders, selectedBadges));
  };

  // Handle badge toggle
  const handleBadgeToggle = (badge) => {
    let newBadges;
    if (selectedBadges.includes(badge)) {
      newBadges = selectedBadges.filter((b) => b !== badge);
    } else {
      newBadges = [...selectedBadges, badge];
    }
    navigate(buildUrl(selectedCategories, selectedGenders, newBadges));
  };

  // Sizes stack: pick M and L to see both.
  const sizeUrl = (size) => {
    const params = new URLSearchParams(searchParams);
    const next = size == null
      ? []
      : selectedSizes.includes(size)
        ? selectedSizes.filter((s) => s !== size)
        : [...selectedSizes, size];
    params.delete('size');
    next.forEach((s) => params.append('size', s));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : '/shop';
  };

  // Clear all filters
  const handleClearAll = () => {
    navigate('/shop');
  };

  const hasActiveFilters = !isAllCategoriesSelected || !isAllGenderSelected || !isAllBadgesSelected
    || selectedSizes.length > 0 || !!searchParams.get('q');

  const sizeChips = (compact) => sizes.length > 0 && (
    <div>
      <p className={`text-[10px] text-text-light uppercase tracking-[0.2em] ${compact ? 'mb-2' : 'mb-3'} font-semibold`}>{compact ? 'Size' : 'SIZE'}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate(sizeUrl(null), { replace: true })}
          aria-pressed={selectedSizes.length === 0}
          className={`${compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-full font-medium transition-all duration-200 ${
            selectedSizes.length === 0
              ? 'bg-accent-brown text-white shadow-soft'
              : compact ? 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white' : 'text-text-dark hover:bg-neutral-white/60'
          }`}
        >
          All
        </button>
        {sizes.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              onClick={() => navigate(sizeUrl(size), { replace: true })}
              aria-pressed={isSelected}
              className={`${compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-full font-medium uppercase transition-all duration-200 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-accent-brown text-white shadow-soft'
                  : compact ? 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white' : 'text-text-dark hover:bg-neutral-white/60'
              }`}
            >
              {size}
              {isSelected && <span className="text-xs opacity-80">✕</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-neutral-warm-beige/40 border-b border-neutral-warm-beige">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-5 md:pt-4 md:pb-6">
        <SearchSort />

        {/* ===== DESKTOP: stacked layout (hidden below md) ===== */}
        <div className="hidden md:block">
          <div className="flex flex-col gap-6">
            {/* Gender Filter */}
            <div>
              <p className="text-[10px] text-text-light uppercase tracking-[0.2em] mb-3 font-semibold">GENDER</p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(buildUrl(selectedCategories, [], selectedBadges))}
                  aria-pressed={isAllGenderSelected}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isAllGenderSelected
                      ? 'bg-accent-brown text-white shadow-soft'
                      : 'text-text-dark hover:bg-neutral-white/60'
                  }`}
                >
                  All
                </button>
                {['men', 'women'].map((gender) => {
                  const isSelected = selectedGenders.includes(gender);
                  return (
                    <button
                      key={gender}
                      onClick={() => handleGenderToggle(gender)}
                      aria-pressed={isSelected}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-accent-brown text-white shadow-soft'
                          : 'text-text-dark hover:bg-neutral-white/60'
                      }`}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      {isSelected && <span className="text-xs opacity-80">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <p className="text-[10px] text-text-light uppercase tracking-[0.2em] mb-3 font-semibold">CATEGORY</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={buildUrl([], selectedGenders, selectedBadges)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isAllCategoriesSelected
                      ? 'bg-accent-brown text-white shadow-soft'
                      : 'text-text-dark hover:bg-neutral-white/60'
                  }`}
                >
                  All
                </Link>

                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category.slug.current);
                  return (
                    <button
                      key={category.slug.current}
                      onClick={() => handleCategoryToggle(category.slug.current)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-accent-brown text-white shadow-soft'
                          : 'text-text-dark hover:bg-neutral-white/60'
                      }`}
                    >
                      {category.name}
                      {isSelected && <span className="text-xs opacity-80">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Filter */}
            {sizeChips(false)}

            {/* Badge Filter */}
            {badges.length > 0 && (
              <div>
                <p className="text-[10px] text-text-light uppercase tracking-[0.2em] mb-3 font-semibold">BADGE</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(buildUrl(selectedCategories, selectedGenders, []))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isAllBadgesSelected
                        ? 'bg-accent-brown text-white shadow-soft'
                        : 'text-text-dark hover:bg-neutral-white/60'
                    }`}
                  >
                    All
                  </button>

                  {badges.map((badge) => {
                    const isSelected = selectedBadges.includes(badge);
                    return (
                      <button
                        key={badge}
                        onClick={() => handleBadgeToggle(badge)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-accent-brown text-white shadow-soft'
                            : 'text-text-dark hover:bg-neutral-white/60'
                        }`}
                      >
                        {badge}
                        {isSelected && <span className="text-xs opacity-80">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clear all */}
            {hasActiveFilters && (
              <div className="flex justify-end mt-1">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-text-light hover:text-accent-brown transition-colors underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===== MOBILE: collapsible dropdown (visible below md) ===== */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="w-full flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-accent-brown"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-xs text-text-light uppercase tracking-wider font-medium">
                Filters{hasActiveFilters && <span className="ml-1 text-accent-brown">●</span>}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 text-text-light transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible panel */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: mobileOpen ? '1000px' : '0px',
              opacity: mobileOpen ? 1 : 0,
            }}
          >
            <div className="pt-3 pb-1 space-y-4">
              {/* Gender */}
              <div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(buildUrl(selectedCategories, [], selectedBadges))}
                    aria-pressed={isAllGenderSelected}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isAllGenderSelected
                        ? 'bg-accent-brown text-white shadow-soft'
                        : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                    }`}
                  >
                    All
                  </button>
                  {['men', 'women'].map((gender) => {
                    const isSelected = selectedGenders.includes(gender);
                    return (
                      <button
                        key={gender}
                        onClick={() => handleGenderToggle(gender)}
                        aria-pressed={isSelected}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                          isSelected
                            ? 'bg-accent-brown text-white shadow-soft'
                            : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                        }`}
                      >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        {isSelected && <span className="text-[10px] opacity-80">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-[10px] text-text-light uppercase tracking-[0.2em] mb-2 font-semibold">Category</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={buildUrl([], selectedGenders, selectedBadges)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isAllCategoriesSelected
                        ? 'bg-accent-brown text-white shadow-soft'
                        : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                    }`}
                  >
                    All
                  </Link>

                  {categories.map((category) => {
                    const isSelected = selectedCategories.includes(category.slug.current);
                    return (
                      <button
                        key={category.slug.current}
                        onClick={() => handleCategoryToggle(category.slug.current)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                          isSelected
                            ? 'bg-accent-brown text-white shadow-soft'
                            : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                        }`}
                      >
                        {category.name}
                        {isSelected && <span className="text-[10px] opacity-80">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size */}
              {sizeChips(true)}

              {/* Badge */}
              {badges.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-light uppercase tracking-[0.2em] mb-2 font-semibold">Badge</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(buildUrl(selectedCategories, selectedGenders, []))}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        isAllBadgesSelected
                          ? 'bg-accent-brown text-white shadow-soft'
                          : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                      }`}
                    >
                      All
                    </button>

                    {badges.map((badge) => {
                      const isSelected = selectedBadges.includes(badge);
                      return (
                        <button
                          key={badge}
                          onClick={() => handleBadgeToggle(badge)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                            isSelected
                              ? 'bg-accent-brown text-white shadow-soft'
                              : 'text-text-dark bg-neutral-white/70 hover:bg-neutral-white'
                          }`}
                        >
                          {badge}
                          {isSelected && <span className="text-[10px] opacity-80">✕</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear all */}
              {hasActiveFilters && (
                <button
                  onClick={() => { handleClearAll(); setMobileOpen(false); }}
                  className="text-xs text-text-light hover:text-accent-brown transition-colors underline underline-offset-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
