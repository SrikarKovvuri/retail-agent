import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const SURVEY_STEPS = [
  {
    id: 0,
    title: 'Store Profile',
    description: 'Tell us about your store so suppliers know who they are working with.',
  },
  {
    id: 1,
    title: 'Inventory Needs',
    description: 'List the products and quantities you are hoping to restock.',
  },
  {
    id: 2,
    title: 'Budget & Priorities',
    description: 'Share your budget target and any special instructions for our sourcing agents.',
  },
  {
    id: 3,
    title: 'Review & Submit',
    description: 'Double-check the details before we connect you with suppliers.',
  },
];

const FALLBACK_DASHBOARD = {
  products: [
    {
      id: 'product-organic-apples',
      name: 'Organic Apples',
      category: 'Produce',
      quantity: 250,
      unit: 'lbs',
      status: 'negotiating',
      lastUpdated: '2025-11-07T15:42:00Z',
      confirmedOfferId: null,
      notes: 'Prefers Honeycrisp, ready to ship within two weeks.',
      offers: [
        {
          id: 'offer-hudson-valley',
          supplierName: 'Hudson Valley Farms',
          pricePerUnit: 1.34,
          minimumOrder: 200,
          leadTime: '5 days',
          freightTerms: 'FOB - Hudson NY',
          status: 'counter-offer',
          lastUpdated: '2025-11-07T15:30:00Z',
        },
        {
          id: 'offer-green-growers',
          supplierName: 'Green Growers Cooperative',
          pricePerUnit: 1.29,
          minimumOrder: 250,
          leadTime: '7 days',
          freightTerms: 'Delivered',
          status: 'pending',
          lastUpdated: '2025-11-07T14:50:00Z',
        },
        {
          id: 'offer-fresh-harvest',
          supplierName: 'Fresh Harvest Distributors',
          pricePerUnit: 1.45,
          minimumOrder: 200,
          leadTime: '3 days',
          freightTerms: 'FOB - Yonkers NY',
          status: 'negotiating',
          lastUpdated: '2025-11-07T13:10:00Z',
        },
      ],
    },
    {
      id: 'product-oat-milk',
      name: 'Barista Oat Milk',
      category: 'Beverages',
      quantity: 180,
      unit: 'cases',
      status: 'awaiting-response',
      lastUpdated: '2025-11-07T11:12:00Z',
      confirmedOfferId: null,
      notes: 'Need shelf-stable cases, 12 units per case.',
      offers: [
        {
          id: 'offer-latte-supply',
          supplierName: 'Latte Supply Co.',
          pricePerUnit: 23.9,
          minimumOrder: 150,
          leadTime: '6 days',
          freightTerms: 'Delivered - LTL',
          status: 'pending',
          lastUpdated: '2025-11-07T10:45:00Z',
        },
        {
          id: 'offer-morning-brew',
          supplierName: 'Morning Brew Wholesale',
          pricePerUnit: 24.75,
          minimumOrder: 200,
          leadTime: '4 days',
          freightTerms: 'Delivered',
          status: 'negotiating',
          lastUpdated: '2025-11-07T09:55:00Z',
        },
      ],
    },
    {
      id: 'product-cleaning-wipes',
      name: 'Disinfecting Surface Wipes',
      category: 'Store Supplies',
      quantity: 90,
      unit: 'cases',
      status: 'counter-received',
      lastUpdated: '2025-11-07T16:05:00Z',
      confirmedOfferId: null,
      notes: 'Unscented preferred. Ship to warehouse.',
      offers: [
        {
          id: 'offer-sparklean',
          supplierName: 'Sparklean Industries',
          pricePerUnit: 18.1,
          minimumOrder: 80,
          leadTime: '8 days',
          freightTerms: 'FOB - Newark NJ',
          status: 'counter-offer',
          lastUpdated: '2025-11-07T15:58:00Z',
        },
        {
          id: 'offer-steri-pro',
          supplierName: 'SteriPro Distribution',
          pricePerUnit: 19.4,
          minimumOrder: 60,
          leadTime: '5 days',
          freightTerms: 'Delivered',
          status: 'pending',
          lastUpdated: '2025-11-07T14:20:00Z',
        },
      ],
    },
  ],
  inbox: [
    {
      id: 'thread-apples-01',
      supplierName: 'Green Growers Cooperative',
      subject: 'Re: Organic Apples counter offer @ $1.29',
      preview:
        'We can honor $1.29/lb if you can confirm 48-hour turnaround on PO. Please see attached draft contract.',
      receivedAt: '2025-11-07T15:45:00Z',
      relatedProductId: 'product-organic-apples',
      unread: true,
    },
    {
      id: 'thread-wipes-01',
      supplierName: 'Sparklean Industries',
      subject: 'Counter offer – Disinfecting Surface Wipes',
      preview:
        'Happy to reduce to $18.10/case if you can accommodate split shipping between stores A and B.',
      receivedAt: '2025-11-07T15:58:00Z',
      relatedProductId: 'product-cleaning-wipes',
      unread: false,
    },
    {
      id: 'thread-oatmilk-02',
      supplierName: 'Latte Supply Co.',
      subject: 'Need confirmation on pallet count',
      preview: 'Checking whether you can receive 10 pallets on Monday. Awaiting your response to finalize.',
      receivedAt: '2025-11-07T12:15:00Z',
      relatedProductId: 'product-oat-milk',
      unread: false,
    },
  ],
};

const defaultInventoryItem = (seed = Date.now()) => ({
  id: seed,
  productName: '',
  quantity: '',
  unit: 'units',
  targetPrice: '',
  notes: '',
});

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';

  const diffInMs = Date.now() - date.getTime();
  const minutes = Math.round(diffInMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

function App() {
  const [appStage, setAppStage] = useState('survey');
  const [currentStep, setCurrentStep] = useState(0);
  const [storeProfile, setStoreProfile] = useState({
    storeName: '',
    location: '',
    contactName: '',
    contactEmail: '',
    phoneNumber: '',
  });
  const [inventoryItems, setInventoryItems] = useState([defaultInventoryItem()]);
  const [budgetDetails, setBudgetDetails] = useState({
    totalBudget: '',
    preferredVendors: '',
    deliveryTimeline: '',
    mustHaves: '',
  });
  const [submissionState, setSubmissionState] = useState({ status: 'idle', message: '' });
  const [dashboardState, setDashboardState] = useState({ products: [], inbox: [] });
  const [dashboardStatus, setDashboardStatus] = useState({ loading: false, error: '' });
  const [dashboardView, setDashboardView] = useState('products');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [dashboardToast, setDashboardToast] = useState(null);

  useEffect(() => {
    if (!dashboardToast) return undefined;
    const timeout = window.setTimeout(() => setDashboardToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [dashboardToast]);

  const fetchDashboardData = useCallback(async () => {
    setDashboardStatus({ loading: true, error: '' });
    try {
      const response = await axios.get('/api/dashboard');
      const products = Array.isArray(response?.data?.products) ? response.data.products : [];
      const inbox = Array.isArray(response?.data?.inbox) ? response.data.inbox : [];

      setDashboardState({ products, inbox });

      if (products.length) {
        const fallbackProductId = products[0].id;
        setSelectedProductId((current) => {
          if (!current) return fallbackProductId;
          const stillExists = products.some((product) => product.id === current);
          return stillExists ? current : fallbackProductId;
        });
      }

      setDashboardStatus({ loading: false, error: '' });
      return true;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Live agent data is unavailable right now. Showing the latest synced results.';
      setDashboardState(FALLBACK_DASHBOARD);
      if (FALLBACK_DASHBOARD.products.length) {
        const fallbackProductId = FALLBACK_DASHBOARD.products[0].id;
        setSelectedProductId((current) => current || fallbackProductId);
      }
      setDashboardStatus({ loading: false, error: message });
      return false;
    }
  }, []);

  useEffect(() => {
    if (appStage !== 'dashboard') return;
    if (dashboardState.products.length > 0) {
      setDashboardStatus({ loading: false, error: '' });
      return;
    }
    fetchDashboardData();
  }, [appStage, fetchDashboardData, dashboardState.products.length]);

  const storeProfileValid = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      storeProfile.storeName.trim() !== '' &&
      storeProfile.contactName.trim() !== '' &&
      storeProfile.contactEmail.trim() !== '' &&
      emailPattern.test(storeProfile.contactEmail)
    );
  }, [storeProfile]);

  const inventoryValid = useMemo(() => {
    if (!inventoryItems.length) return false;
    return inventoryItems.every((item) => {
      const hasName = item.productName.trim().length > 0;
      const quantityNumber = Number(item.quantity);
      const hasQuantity = Number.isFinite(quantityNumber) && quantityNumber > 0;
      return hasName && hasQuantity;
    });
  }, [inventoryItems]);

  const budgetValid = useMemo(() => {
    const budgetNumber = Number(budgetDetails.totalBudget);
    return Number.isFinite(budgetNumber) && budgetNumber > 0;
  }, [budgetDetails]);

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 0:
        return storeProfileValid;
      case 1:
        return inventoryValid;
      case 2:
        return budgetValid;
      default:
        return true;
    }
  }, [currentStep, storeProfileValid, inventoryValid, budgetValid]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return dashboardState.products.find((product) => product.id === selectedProductId) || null;
  }, [dashboardState.products, selectedProductId]);

  const sortedOffers = useMemo(() => {
    if (!selectedProduct?.offers?.length) return [];
    return [...selectedProduct.offers].sort((a, b) => {
      if (a.pricePerUnit == null) return 1;
      if (b.pricePerUnit == null) return -1;
      return a.pricePerUnit - b.pricePerUnit;
    });
  }, [selectedProduct]);

  const setSurveyStep = (step) => {
    setCurrentStep(step);
    setSubmissionState({ status: 'idle', message: '' });
  };

  const handleInventoryChange = (id, field, value) => {
    setInventoryItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addInventoryItem = () => {
    setInventoryItems((items) => [...items, defaultInventoryItem(Date.now() + items.length)]);
  };

  const removeInventoryItem = (id) => {
    setInventoryItems((items) => (items.length === 1 ? items : items.filter((item) => item.id !== id)));
  };

  const generateMockSuppliers = (productName, targetPrice, quantity) => {
    const basePrice = targetPrice ? Number(targetPrice) : null;
    const mockSupplierNames = [
      'Premium Wholesale Co.',
      'Global Supply Partners',
      'Direct Trade Distributors',
      'Quality Goods Network',
      'Bulk Buy Solutions',
      'Trusted Vendor Group',
    ];

    const suppliers = [];
    const numSuppliers = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numSuppliers; i++) {
      const supplierIndex = i % mockSupplierNames.length;
      const priceVariation = (Math.random() - 0.4) * 0.3;
      const calculatedPrice = basePrice
        ? basePrice * (1 + priceVariation)
        : 10 + Math.random() * 50;

      const statuses = ['pending', 'negotiating', 'counter-offer'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      suppliers.push({
        id: `offer-${productName.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        supplierName: mockSupplierNames[supplierIndex],
        pricePerUnit: Number(calculatedPrice.toFixed(2)),
        minimumOrder: Math.max(10, Math.floor(quantity * 0.6)),
        leadTime: `${3 + Math.floor(Math.random() * 7)} days`,
        freightTerms: Math.random() > 0.5 ? 'Delivered' : `FOB - Warehouse ${String.fromCharCode(65 + i)}`,
        status,
        lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
      });
    }

    return suppliers.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  };

  const handleSubmit = () => {
    setSubmissionState({ status: 'loading', message: 'Processing your request…' });

    setTimeout(() => {
      const products = inventoryItems
        .filter((item) => item.productName.trim() && Number(item.quantity) > 0)
        .map((item, index) => {
          const productId = `product-${item.productName.toLowerCase().replace(/\s+/g, '-')}-${index}`;
          const offers = generateMockSuppliers(item.productName, item.targetPrice, Number(item.quantity));

          const statuses = ['negotiating', 'awaiting-response', 'counter-received'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          return {
            id: productId,
            name: item.productName,
            category: 'General',
            quantity: Number(item.quantity),
            unit: item.unit,
            status,
            lastUpdated: new Date().toISOString(),
            confirmedOfferId: null,
            notes: item.notes || '',
            offers,
          };
        });

      const inbox = products.flatMap((product) => {
        const unreadCount = Math.floor(Math.random() * 2);
        const threads = [];

        for (let i = 0; i < unreadCount; i++) {
          const offer = product.offers[Math.floor(Math.random() * product.offers.length)];
          threads.push({
            id: `thread-${product.id}-${i}`,
            supplierName: offer.supplierName,
            subject: `Re: ${product.name} - ${offer.status === 'counter-offer' ? 'Counter offer' : 'Price update'}`,
            preview: `We can offer $${offer.pricePerUnit.toFixed(2)}/unit with ${offer.leadTime} lead time. Please confirm if this works for you.`,
            receivedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            relatedProductId: product.id,
            unread: true,
          });
        }

        return threads;
      });

      setDashboardState({ products, inbox });

      if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }

      setSubmissionState({
        status: 'success',
        message: 'Your request has been processed! Review supplier offers below.',
      });

      setTimeout(() => {
        setAppStage('dashboard');
        setDashboardView('products');
      }, 1500);
    }, 1000);
  };

  const handleGoToDashboard = () => {
    setAppStage('dashboard');
    setDashboardView('products');
  };

  const handleConfirmSupplier = async (productId, offerId) => {
    if (!productId || !offerId) return;

    const previousState = JSON.parse(JSON.stringify(dashboardState));

    setDashboardState((state) => {
      const products = state.products.map((product) => {
        if (product.id !== productId) return product;
        return {
          ...product,
          status: 'confirmed',
          confirmedOfferId: offerId,
          offers: product.offers.map((offer) => ({
            ...offer,
            status: offer.id === offerId ? 'confirmed' : offer.status === 'confirmed' ? 'outbid' : offer.status,
          })),
        };
      });

      return { ...state, products };
    });

    const productName = previousState.products.find((product) => product.id === productId)?.name || 'Product';
    
    try {
      await axios.post(`/api/inventory/${productId}/confirm`, { offerId });
      setDashboardToast({ type: 'success', message: `${productName} has been marked as confirmed.` });
      await fetchDashboardData();
    } catch (error) {
      setDashboardToast({ type: 'success', message: `${productName} has been marked as confirmed (demo mode).` });
    }
  };

  const handleRefreshDashboard = async () => {
    setDashboardToast({ type: 'info', message: 'Refreshing the latest supplier updates…' });
    const success = await fetchDashboardData();
    setDashboardToast({
      type: success ? 'success' : 'error',
      message: success ? 'Latest supplier updates synced.' : 'Showing the last synced supplier data.',
    });
  };

  const resolveProductStatusLabel = (status) => {
    switch (status) {
      case 'negotiating':
        return 'Negotiating';
      case 'awaiting-response':
        return 'Awaiting response';
      case 'counter-received':
        return 'Counter offer received';
      case 'confirmed':
        return 'Confirmed';
      default:
        return 'In review';
    }
  };

  const resolveOfferStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending response';
      case 'counter-offer':
        return 'Counter offer';
      case 'negotiating':
        return 'Negotiating';
      case 'confirmed':
        return 'Confirmed';
      case 'outbid':
        return 'Outbid';
      default:
        return 'Open';
    }
  };

  const renderStoreProfileStep = () => (
    <div className="card">
      <div className="card-header">
        <h2>Store Basics</h2>
        <p>Introduce your business so we can tailor the supplier search.</p>
      </div>
      <div className="card-body grid two-column">
        <label className="field">
          <span>Store name *</span>
          <input
            type="text"
            value={storeProfile.storeName}
            onChange={(event) => setStoreProfile({ ...storeProfile, storeName: event.target.value })}
            placeholder="Ex: Uptown Market"
          />
        </label>
        <label className="field">
          <span>Store location</span>
          <input
            type="text"
            value={storeProfile.location}
            onChange={(event) => setStoreProfile({ ...storeProfile, location: event.target.value })}
            placeholder="City, State"
          />
        </label>
        <label className="field">
          <span>Primary contact *</span>
          <input
            type="text"
            value={storeProfile.contactName}
            onChange={(event) => setStoreProfile({ ...storeProfile, contactName: event.target.value })}
            placeholder="Full name"
          />
        </label>
        <label className="field">
          <span>Contact email *</span>
          <input
            type="email"
            value={storeProfile.contactEmail}
            onChange={(event) => setStoreProfile({ ...storeProfile, contactEmail: event.target.value })}
            placeholder="name@store.com"
          />
        </label>
        <label className="field">
          <span>Phone number</span>
          <input
            type="tel"
            value={storeProfile.phoneNumber}
            onChange={(event) => setStoreProfile({ ...storeProfile, phoneNumber: event.target.value })}
            placeholder="(555) 123-4567"
          />
        </label>
      </div>
      <footer className="card-footer">
        <StepControls
          canAdvance={canAdvance}
          onNext={() => setSurveyStep(currentStep + 1)}
          isFirstStep
        />
      </footer>
    </div>
  );

  const renderInventoryStep = () => (
    <div className="card">
      <div className="card-header">
        <h2>Inventory Needs</h2>
        <p>Tell us what you need restocked. Add as many products as you like.</p>
      </div>
      <div className="card-body">
        <div className="inventory-list">
          {inventoryItems.map((item, index) => (
            <div className="inventory-item" key={item.id}>
              <div className="inventory-item-header">
                <h3>Product {index + 1}</h3>
                {inventoryItems.length > 1 && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => removeInventoryItem(item.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid three-column">
                <label className="field">
                  <span>Product name *</span>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(event) => handleInventoryChange(item.id, 'productName', event.target.value)}
                    placeholder="Ex: Organic Apples"
                  />
                </label>
                <label className="field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => handleInventoryChange(item.id, 'quantity', event.target.value)}
                    placeholder="Ex: 250"
                  />
                </label>
                <label className="field">
                  <span>Unit</span>
                  <select
                    value={item.unit}
                    onChange={(event) => handleInventoryChange(item.id, 'unit', event.target.value)}
                  >
                    <option value="units">Units</option>
                    <option value="cases">Cases</option>
                    <option value="pallets">Pallets</option>
                    <option value="lbs">Pounds</option>
                  </select>
                </label>
              </div>
              <div className="grid two-column">
                <label className="field">
                  <span>Target price (per unit)</span>
                  <input
                    type="number"
                    min="0"
                    value={item.targetPrice}
                    onChange={(event) => handleInventoryChange(item.id, 'targetPrice', event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(event) => handleInventoryChange(item.id, 'notes', event.target.value)}
                    placeholder="Packaging, brand preferences, etc."
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="secondary-button" onClick={addInventoryItem}>
          + Add another product
        </button>
      </div>
      <footer className="card-footer">
        <StepControls
          canAdvance={canAdvance}
          onBack={() => setSurveyStep(currentStep - 1)}
          onNext={() => setSurveyStep(currentStep + 1)}
        />
      </footer>
    </div>
  );

  const renderBudgetStep = () => (
    <div className="card">
      <div className="card-header">
        <h2>Budget & Priorities</h2>
        <p>Help us negotiate the best deal by sharing your targets and preferences.</p>
      </div>
      <div className="card-body grid two-column">
        <label className="field">
          <span>Total budget (USD) *</span>
          <input
            type="number"
            min="0"
            value={budgetDetails.totalBudget}
            onChange={(event) => setBudgetDetails({ ...budgetDetails, totalBudget: event.target.value })}
            placeholder="Ex: 12,500"
          />
        </label>
        <label className="field">
          <span>Target delivery timeline</span>
          <input
            type="text"
            value={budgetDetails.deliveryTimeline}
            onChange={(event) => setBudgetDetails({ ...budgetDetails, deliveryTimeline: event.target.value })}
            placeholder="Ex: Within 3 weeks"
          />
        </label>
        <label className="field">
          <span>Preferred supplier names</span>
          <textarea
            value={budgetDetails.preferredVendors}
            onChange={(event) => setBudgetDetails({ ...budgetDetails, preferredVendors: event.target.value })}
            placeholder="Optional: existing suppliers you like working with"
            rows={3}
          />
        </label>
        <label className="field">
          <span>Must-have requirements</span>
          <textarea
            value={budgetDetails.mustHaves}
            onChange={(event) => setBudgetDetails({ ...budgetDetails, mustHaves: event.target.value })}
            placeholder="Certifications, shipping preferences, payment terms, etc."
            rows={3}
          />
        </label>
      </div>
      <footer className="card-footer">
        <StepControls
          canAdvance={canAdvance}
          onBack={() => setSurveyStep(currentStep - 1)}
          onNext={() => setSurveyStep(currentStep + 1)}
        />
      </footer>
    </div>
  );

  const renderReviewStep = () => (
    <div className="card">
      <div className="card-header">
        <h2>Review your request</h2>
        <p>Everything look good? Submit now and the sourcing agents will get started.</p>
      </div>
      <div className="card-body review">
        <section>
          <h3>Store profile</h3>
          <ul>
            <li><strong>Store:</strong> {storeProfile.storeName || '—'}</li>
            <li><strong>Location:</strong> {storeProfile.location || '—'}</li>
            <li><strong>Contact:</strong> {storeProfile.contactName || '—'}</li>
            <li><strong>Email:</strong> {storeProfile.contactEmail || '—'}</li>
            <li><strong>Phone:</strong> {storeProfile.phoneNumber || '—'}</li>
          </ul>
        </section>
        <section>
          <h3>Inventory summary</h3>
          <div className="review-inventory">
            {inventoryItems.map((item) => (
              <article key={item.id}>
                <h4>{item.productName || 'Unnamed product'}</h4>
                <p>
                  {item.quantity || '0'} {item.unit}
                  {item.targetPrice && (
                    <span> · Target ${Number(item.targetPrice).toLocaleString()}</span>
                  )}
                </p>
                {item.notes && <p className="muted">Notes: {item.notes}</p>}
              </article>
            ))}
          </div>
        </section>
        <section>
          <h3>Budget</h3>
          <ul>
            <li>
              <strong>Total budget:</strong>{' '}
              {budgetDetails.totalBudget
                ? `$${Number(budgetDetails.totalBudget).toLocaleString()}`
                : '—'}
            </li>
            <li><strong>Delivery timeline:</strong> {budgetDetails.deliveryTimeline || '—'}</li>
            <li><strong>Preferred suppliers:</strong> {budgetDetails.preferredVendors || '—'}</li>
            <li><strong>Must-haves:</strong> {budgetDetails.mustHaves || '—'}</li>
          </ul>
        </section>
        {submissionState.status !== 'idle' && (
          <div className={`alert ${submissionState.status}`}>
            {submissionState.message}
          </div>
        )}
      </div>
      <footer className="card-footer">
        <StepControls
          canAdvance
          onBack={() => setSurveyStep(currentStep - 1)}
          onSubmit={submissionState.status === 'success' ? handleGoToDashboard : handleSubmit}
          isFinalStep
          isSubmitting={submissionState.status === 'loading' && submissionState.status !== 'success'}
          finalLabel={submissionState.status === 'success' ? 'Go to supplier dashboard' : undefined}
          finalDisabled={submissionState.status === 'loading' && submissionState.status !== 'success'}
        />
      </footer>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStoreProfileStep();
      case 1:
        return renderInventoryStep();
      case 2:
        return renderBudgetStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };

  const renderProductsDashboard = () => (
    <div className="dashboard-panels">
      <section className="product-column">
        <header className="product-column-header">
          <h2>Pending requests</h2>
          <p>Click a product to review supplier offers and confirm a partner.</p>
        </header>
        <div className="product-list">
          {dashboardState.products.map((product) => {
            const isActive = product.id === selectedProductId;
            return (
              <button
                key={product.id}
                type="button"
                className={`product-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedProductId(product.id)}
              >
                <div className="product-card-header">
                  <h3>{product.name}</h3>
                  <span className={`status-pill ${product.status}`}>
                    {resolveProductStatusLabel(product.status)}
                  </span>
                </div>
                <p className="product-card-meta">
                  {product.quantity} {product.unit} · Updated {formatRelativeTime(product.lastUpdated)}
                </p>
                {product.notes && <p className="product-card-notes">{product.notes}</p>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="detail-column">
        {selectedProduct ? (
          <div className="product-detail-card">
            <header className="detail-header">
              <div>
                <p className="detail-eyebrow">Supplier leaderboard</p>
                <h2>{selectedProduct.name}</h2>
                <p className="detail-meta">
                  {selectedProduct.quantity} {selectedProduct.unit} requested ·{' '}
                  {resolveProductStatusLabel(selectedProduct.status)}
                </p>
              </div>
              <div className="detail-actions">
                <button type="button" className="secondary-button" onClick={handleRefreshDashboard}>
                  Refresh offers
                </button>
              </div>
            </header>
            <div className="offer-table" role="list">
              {sortedOffers.map((offer, index) => {
                const isConfirmed =
                  selectedProduct.confirmedOfferId === offer.id || offer.status === 'confirmed';
                return (
                  <article
                    key={offer.id}
                    className={`offer-row ${isConfirmed ? 'confirmed' : ''}`}
                    role="listitem"
                  >
                    <span className="offer-rank">#{index + 1}</span>
                    <div className="offer-main">
                      <h3>{offer.supplierName}</h3>
                      <div className="offer-meta">
                        <span className="offer-price">
                          {offer.pricePerUnit != null ? `$${offer.pricePerUnit.toFixed(2)}/unit` : '—'}
                        </span>
                        {offer.minimumOrder != null && <span>MOQ {offer.minimumOrder}</span>}
                        {offer.leadTime && <span>{offer.leadTime}</span>}
                        {offer.freightTerms && <span>{offer.freightTerms}</span>}
                      </div>
                    </div>
                    <div className="offer-status">
                      <span className={`status-pill offer ${offer.status}`}>
                        {resolveOfferStatusLabel(offer.status)}
                      </span>
                      <small>Updated {formatRelativeTime(offer.lastUpdated)}</small>
                    </div>
                    <div className="offer-actions">
                      <button
                        type="button"
                        className={`primary-button ${isConfirmed ? 'ghost' : ''}`}
                        onClick={() => handleConfirmSupplier(selectedProduct.id, offer.id)}
                        disabled={isConfirmed}
                      >
                        {isConfirmed ? 'Confirmed' : 'Confirm supplier'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          setSelectedProductId(selectedProduct.id);
                          setDashboardView('inbox');
                        }}
                      >
                        View thread
                      </button>
                    </div>
                  </article>
                );
              })}
              {!sortedOffers.length && (
                <div className="empty-detail">Negotiation in progress. Waiting on supplier responses.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-detail">Select a product card to see supplier offers.</div>
        )}
      </section>
    </div>
  );

  const renderInboxDashboard = () => (
    <div className="inbox-panel">
      <header className="inbox-header">
        <h2>Supplier inbox</h2>
        <p>Keep up with the latest negotiation emails from your sourcing agents.</p>
      </header>
      <div className="inbox-list">
        {dashboardState.inbox.map((thread) => (
          <article key={thread.id} className={`inbox-item ${thread.unread ? 'unread' : ''}`}>
            <div className="inbox-item-header">
              <strong>{thread.supplierName}</strong>
              <span>{formatRelativeTime(thread.receivedAt)}</span>
            </div>
            <h3>{thread.subject}</h3>
            <p>{thread.preview}</p>
            <footer className="inbox-item-footer">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSelectedProductId(thread.relatedProductId);
                  setDashboardView('products');
                }}
              >
                Open product
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!dashboardState.inbox.length && (
        <div className="empty-detail">No supplier responses yet. Check back soon.</div>
      )}
    </div>
  );

  const renderDashboardShell = () => (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <span className="brand-badge">RetailLink</span>
          <h1>Supplier negotiation hub</h1>
          <p>Review live offers, confirm suppliers, and keep up with negotiation threads.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="secondary-button" onClick={handleRefreshDashboard}>
            Refresh data
          </button>
        </div>
      </header>
      <div className="dashboard-tabs">
        <button
          type="button"
          className={`dashboard-tab ${dashboardView === 'products' ? 'active' : ''}`}
          onClick={() => setDashboardView('products')}
        >
          Pending products
        </button>
        <button
          type="button"
          className={`dashboard-tab ${dashboardView === 'inbox' ? 'active' : ''}`}
          onClick={() => setDashboardView('inbox')}
        >
          Inbox
          {dashboardState.inbox.some((thread) => thread.unread) && (
            <span className="badge">{dashboardState.inbox.filter((thread) => thread.unread).length}</span>
          )}
        </button>
      </div>
      {dashboardStatus.error && (
        <div className="inline-warning">{dashboardStatus.error}</div>
      )}
      {dashboardToast && <div className={`alert banner ${dashboardToast.type}`}>{dashboardToast.message}</div>}
      {dashboardStatus.loading && <div className="inline-loading">Syncing with sourcing agents…</div>}
      {dashboardView === 'products' ? renderProductsDashboard() : renderInboxDashboard()}
    </div>
  );

  if (appStage === 'dashboard') {
    return renderDashboardShell();
  }

  return (
    <div className="app-shell">
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-badge">RetailLink</span>
            <h1>Inventory intake survey</h1>
            <p>
              Complete this quick intake to help our sourcing agents match you with the right suppliers.
            </p>
          </div>
          <nav className="stepper">
            {SURVEY_STEPS.map((step, index) => {
              const isActive = currentStep === index;
              const isComplete = currentStep > index;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                  onClick={() => {
                    if (index <= currentStep) {
                      setSurveyStep(index);
                    }
                  }}
                >
                  <span className="step-index">{index + 1}</span>
                  <div className="step-copy">
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="content">{renderStepContent()}</main>
      </div>
    </div>
  );
}

function StepControls({
  canAdvance = true,
  onBack,
  onNext,
  onSubmit,
  isFirstStep = false,
  isFinalStep = false,
  isSubmitting = false,
  finalLabel,
  finalDisabled = false,
}) {
  const nextLabel = isFinalStep ? finalLabel || 'Submit request' : 'Next';

  return (
    <div className="step-controls">
      <div className="left">
        {!isFirstStep && (
          <button type="button" className="ghost-button" onClick={onBack}>
            Back
          </button>
        )}
      </div>
      <div className="right">
        {!isFinalStep && (
          <button
            type="button"
            className="primary-button"
            onClick={onNext}
            disabled={!canAdvance}
          >
            {canAdvance ? 'Next' : 'Complete required fields'}
          </button>
        )}
        {isFinalStep && (
          <button
            type="button"
            className="primary-button"
            onClick={onSubmit}
            disabled={isSubmitting || finalDisabled}
          >
            {isSubmitting ? 'Submitting…' : nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
