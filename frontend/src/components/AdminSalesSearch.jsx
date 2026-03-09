import { useMemo, useState } from 'react';
import { normalizeMojibakeText } from '../utils/text';
import { isSaleVisible } from '../utils/visibleSales';

function resolveSellerName(user) {
  return normalizeMojibakeText(user?.displayName || user?.username || user?.name || String(user?.id || '-'));
}

function resolveStoreName(user) {
  const possibleStore = user?.storeName
    || user?.store
    || user?.shop
    || user?.shopName
    || user?.loja
    || user?.branch
    || user?.branchName
    || user?.unit
    || user?.unitName
    || user?.location
    || user?.city
    || user?.cidade
    || user?.office;

  const normalizedStore = normalizeMojibakeText(possibleStore || '').trim();
  if (normalizedStore) return normalizedStore;

  return '';
}

function resolveSellerWithStore(user) {
  const sellerName = resolveSellerName(user);
  const storeName = resolveStoreName(user);
  return storeName ? `${sellerName} - ${storeName}` : sellerName;
}

function toYmd(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) return ymdMatch[1];

    const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const [, dd, mm, yyyy] = brMatch;
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDatePtBr(value) {
  const ymd = toYmd(value);
  if (!ymd) return '-';
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

function resolveSaleTotal(sale) {
  const explicitTotal = Number(sale?.total || 0);
  if (explicitTotal > 0) return explicitTotal;

  const qty = Number(sale?.quantity || 0);
  const unit = Number(sale?.unit_price || sale?.unitPrice || 0);
  const calculated = qty * unit;
  return Number.isFinite(calculated) ? calculated : 0;
}

function resolveProductServiceLabel(sale) {
  const product = normalizeMojibakeText(sale?.product || '');
  const treadRaw = normalizeMojibakeText(sale?.tread_type || sale?.treadType || '').toLowerCase().trim();
  const treadMap = {
    liso: 'LISO',
    lisa: 'LISO',
    misto: 'MISTO',
    borrachudo: 'BORRACHUDO',
    borrachuda: 'BORRACHUDO'
  };
  const treadType = treadRaw ? (treadMap[treadRaw] || treadRaw.toUpperCase()) : '';
  const withTread = treadType ? `${product} (${treadType})` : product;
  return withTread || '-';
}

function normalizeForSearch(value) {
  return normalizeMojibakeText(String(value || '')).toLowerCase().trim();
}

function buildSalesFromActiveUsers(activeUsers) {
  const users = Array.isArray(activeUsers) ? activeUsers : [];
  const merged = [];

  users.forEach((user) => {
    const userId = String(user?.id || '');
    if (!userId || user?.active === false || String(user?.role || '').toLowerCase() === 'admin') return;

    const sellerName = resolveSellerName(user);
    const storeName = resolveStoreName(user);
    const sellerWithStore = storeName ? `${sellerName} - ${storeName}` : sellerName;
    const salesByYearMonth = user?.salesByYearMonth && typeof user.salesByYearMonth === 'object'
      ? user.salesByYearMonth
      : {};

    Object.values(salesByYearMonth).forEach((months) => {
      if (!months || typeof months !== 'object') return;

      Object.values(months).forEach((monthData) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : [];

        sales.forEach((sale) => {
          if (!isSaleVisible(sale)) return;

          merged.push({
            ...sale,
            __sellerId: String(sale?.userId || userId),
            __sellerName: sellerName,
            __storeName: storeName,
            __sellerWithStore: sellerWithStore,
            __dateYmd: toYmd(sale?.date || sale?.created_at || sale?.createdAt)
          });
        });
      });
    });
  });

  return merged;
}

export default function AdminSalesSearch({ activeAccounts }) {
  const [query, setQuery] = useState('');
  const [sellerId, setSellerId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const sellerOptions = useMemo(() => {
    const users = Array.isArray(activeAccounts) ? activeAccounts : [];
    return users
      .filter((user) => user?.active !== false && String(user?.role || '').toLowerCase() !== 'admin')
      .map((user) => ({
        id: String(user?.id || ''),
        name: resolveSellerName(user),
        store: resolveStoreName(user),
        label: resolveSellerWithStore(user)
      }))
      .filter((user) => user.id)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [activeAccounts]);

  const allValidSales = useMemo(() => buildSalesFromActiveUsers(activeAccounts), [activeAccounts]);

  const executeSearch = () => {
    const normalizedQuery = normalizeForSearch(query);

    const filtered = allValidSales.filter((sale) => {
      if (sellerId !== 'all' && String(sale.__sellerId || '') !== sellerId) return false;

      const saleDate = sale.__dateYmd || '';
      if (startDate && saleDate && saleDate < startDate) return false;
      if (endDate && saleDate && saleDate > endDate) return false;
      if ((startDate || endDate) && !saleDate) return false;

      if (!normalizedQuery) return true;

      const searchable = normalizeForSearch([
        sale.__sellerName,
        sale.client,
        sale.product,
        sale.tread_type,
        sale.treadType,
        sale.desfecho,
        sale.tire_type,
        sale.observation,
        sale.notes
      ].join(' '));

      return searchable.includes(normalizedQuery);
    });

    const sorted = filtered.sort((a, b) => {
      const dateA = a.__dateYmd || '';
      const dateB = b.__dateYmd || '';
      if (dateA !== dateB) return dateA < dateB ? 1 : -1;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });

    setResults(sorted);
    setHasSearched(true);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    executeSearch();
  };

  const handleEnterSearch = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    executeSearch();
  };

  const handleClear = () => {
    setQuery('');
    setSellerId('all');
    setStartDate('');
    setEndDate('');
    setShowFilters(false);
    setResults([]);
    setHasSearched(false);
  };

  const resultSummary = useMemo(() => {
    const count = Array.isArray(results) ? results.length : 0;
    const total = (results || []).reduce((acc, sale) => acc + resolveSaleTotal(sale), 0);
    return { count, total };
  }, [results]);

  return (
    <div className="admin-global-search">
      <div className="admin-global-search-form">
        <div className="admin-global-search-input-wrap">
          <span className="admin-global-search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleEnterSearch}
            placeholder="busca de cliente"
          />
        </div>

        <button
          type="button"
          className={`admin-global-filter-btn${showFilters ? ' active' : ''}`}
          onClick={() => setShowFilters((prev) => !prev)}
          title="Abrir filtros"
          aria-label="Abrir filtros"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" />
          </svg>
        </button>
      </div>

      {showFilters && (
        <form className="admin-global-search-filters" onSubmit={handleSearchSubmit}>
          <select value={sellerId} onChange={(event) => setSellerId(event.target.value)} onKeyDown={handleEnterSearch}>
            <option value="all">Todos</option>
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={seller.id}>{seller.label}</option>
            ))}
          </select>

          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} onKeyDown={handleEnterSearch} />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} onKeyDown={handleEnterSearch} />

          <button type="submit" className="admin-global-search-primary">Pesquisar</button>
          <button type="button" className="admin-global-search-secondary" onClick={handleClear}>Limpar</button>
        </form>
      )}

      {hasSearched && (
        <div className="admin-global-search-results">
          <div className="admin-global-search-summary">
            <span>{resultSummary.count} resultado(s)</span>
            <strong>
              Total: R$ {resultSummary.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="admin-global-search-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conta/Loja</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Vendas e Serviços</th>
                  <th>Tipo de Venda</th>
                  <th>Desfecho</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-global-search-empty">Nenhuma venda encontrada para os filtros informados.</td>
                  </tr>
                ) : (
                  results.map((sale, index) => (
                    <tr key={`${sale?.id || 'sale'}-${index}`}>
                      <td>{sale.__sellerWithStore || sale.__sellerName || '-'}</td>
                      <td className="admin-global-search-date">{formatDatePtBr(sale?.date || sale?.created_at || sale?.createdAt)}</td>
                      <td>{normalizeMojibakeText(sale?.client) || '-'}</td>
                      <td>{resolveProductServiceLabel(sale)}</td>
                      <td>{normalizeMojibakeText(sale?.tire_type || '-').toUpperCase()}</td>
                      <td>{normalizeMojibakeText(sale?.desfecho || '-').toUpperCase()}</td>
                      <td>R$ {resolveSaleTotal(sale).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
