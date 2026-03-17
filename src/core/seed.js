// ============================================================
// SmartHub ERP — Seed Data
// ============================================================

import { db } from './store.js';

export function seedDatabase() {
  const isV3Seeded = localStorage.getItem('smarthub_seeded_v3');
  const isV4Seeded = localStorage.getItem('smarthub_seeded_v4');
  const isV5Seeded = localStorage.getItem('smarthub_seeded_v5');
  
  if (isV1Seeded && isV2Seeded && isV3Seeded && isV4Seeded && isV5Seeded) return;
  
  // Incremental seeding for existing tenants
  if (isV1Seeded && isV2Seeded && isV3Seeded && isV4Seeded && !isV5Seeded) {
    seedModule5Data();
    return;
  }
  
  if (isV1Seeded && isV2Seeded && isV3Seeded && !isV4Seeded) {
    seedModule4Data();
    seedModule5Data();
    return;
  }
  
  if (isV1Seeded && isV2Seeded && !isV3Seeded) {
    seedModule3Data();
    seedModule4Data();
    seedModule5Data();
    return;
  }
  
  if (isV1Seeded && !isV2Seeded) {
    seedModule2Data();
    seedModule3Data();
    seedModule4Data();
    seedModule5Data();
    return;
  }

  // ── Tenant ─────────────────────────────────────────────
  const tenant = db.create('tenants', {
    company_name: 'Patel Retail Pvt. Ltd.',
    industry_type: 'retail',
    country: 'India',
    plan_id: 'plan_growth',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'trial'
  });

  // ── Roles ──────────────────────────────────────────────
  const ownerRole = db.create('roles', {
    tenant_id: tenant.id,
    name: 'Business Owner',
    description: 'Full access to all modules and settings',
    is_system_role: true,
    is_default: false,
    permissions: ['*.view', '*.create', '*.edit', '*.delete', '*.export', '*.approve']
  });

  const financeRole = db.create('roles', {
    tenant_id: tenant.id,
    name: 'Finance Manager',
    description: 'Full access to finance, view access to sales and purchase',
    is_system_role: false,
    is_default: false,
    permissions: [
      'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.export',
      'sales.view', 'purchase.view', 'reports.view', 'reports.export'
    ]
  });

  const salesRole = db.create('roles', {
    tenant_id: tenant.id,
    name: 'Sales Staff',
    description: 'CRM and sales operations',
    is_system_role: false,
    is_default: true,
    permissions: [
      'crm.view', 'crm.create', 'crm.edit',
      'sales.view', 'sales.create',
      'inventory.view'
    ]
  });

  const hrRole = db.create('roles', {
    tenant_id: tenant.id,
    name: 'HR Manager',
    description: 'Full access to HR and payroll',
    is_system_role: false,
    is_default: false,
    permissions: [
      'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.approve',
      'reports.view'
    ]
  });

  const inventoryRole = db.create('roles', {
    tenant_id: tenant.id,
    name: 'Inventory Manager',
    description: 'Full inventory and stock management',
    is_system_role: false,
    is_default: false,
    permissions: [
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
      'purchase.view', 'purchase.create',
      'reports.view'
    ]
  });

  // ── Permissions Master List ────────────────────────────
  const modules = ['users', 'crm', 'inventory', 'sales', 'purchase', 'finance', 'hr', 'projects', 'reports', 'settings'];
  const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

  modules.forEach(mod => {
    actions.forEach(act => {
      db.create('permissions', {
        module: mod,
        action: act,
        description: `${act.charAt(0).toUpperCase() + act.slice(1)} ${mod}`
      });
    });
  });

  // ── Users ──────────────────────────────────────────────
  // Hash for "Admin@123" — the demo password
  const demoPasswordHash = 'hash_xhqjdt';

  const owner = db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Rajesh Kumar',
    email: 'rajesh@smarthub.com',
    phone: '9876543210',
    password_hash: demoPasswordHash,
    role_id: ownerRole.id,
    status: 'active',
    email_verified: true,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-03-10T09:30:00Z'
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Priya Sharma',
    email: 'priya@smarthub.com',
    phone: '9876541234',
    password_hash: demoPasswordHash,
    role_id: financeRole.id,
    status: 'active',
    email_verified: true,
    two_fa_enabled: true,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-03-10T10:15:00Z'
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Amit Patel',
    email: 'amit@smarthub.com',
    phone: '9988776655',
    password_hash: demoPasswordHash,
    role_id: salesRole.id,
    status: 'active',
    email_verified: true,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-03-09T14:00:00Z'
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Sneha Desai',
    email: 'sneha@smarthub.com',
    phone: '9876511111',
    password_hash: demoPasswordHash,
    role_id: hrRole.id,
    status: 'active',
    email_verified: true,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-03-08T16:45:00Z'
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Vikram Singh',
    email: 'vikram@smarthub.com',
    phone: '9876522222',
    password_hash: demoPasswordHash,
    role_id: inventoryRole.id,
    status: 'active',
    email_verified: true,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-03-07T11:20:00Z'
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Neha Joshi',
    email: 'neha@smarthub.com',
    phone: '9876533333',
    password_hash: demoPasswordHash,
    role_id: salesRole.id,
    status: 'pending',
    email_verified: false,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: null
  });

  db.create('users', {
    tenant_id: tenant.id,
    full_name: 'Rahul Verma',
    email: 'rahul@smarthub.com',
    phone: '9876544444',
    password_hash: demoPasswordHash,
    role_id: salesRole.id,
    status: 'inactive',
    email_verified: true,
    two_fa_enabled: false,
    login_attempts: 0,
    avatar_url: null,
    last_login_at: '2025-01-15T09:00:00Z'
  });

  seedModule2Data(tenant, owner);
  seedModule3Data(tenant, owner);
  seedModule4Data(tenant, owner);
  seedModule5Data(tenant, owner);

  db.markSeeded();
  console.log('✅ SmartHub ERP — Database seeded successfully');
  console.log('   Demo Login: rajesh@smarthub.com / Admin@123');
}

function seedModule2Data(tenantParam, ownerParam) {
  const tenant = tenantParam || db.find('tenants', () => true)[0];
  const owner = ownerParam || db.find('users', u => u.email === 'rajesh@smarthub.com')[0];
  
  if (!tenant || !owner) return;

  // ── Module 2: Company Setup Data ───────────────────────
  const company = db.create('companies', {
    tenant_id: tenant.id,
    name: 'Patel Retail Pvt. Ltd.',
    display_name: 'Patel Retail',
    reg_number: 'U52100GJ2020PTC112345',
    gst_number: '24AABCP1234A1Z5',
    pan_number: 'AABCP1234A',
    company_type: 'pvt_ltd',
    email: 'info@patelretail.com',
    phone: '07926123456',
    website: 'https://www.patelretail.com',
    founded_year: 2020,
    address_line1: 'Shop No. 12, Navrangpura Complex',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    pincode: '380009',
    primary_color: '#6366f1',
    invoice_footer: 'Thank you for your business! | GSTIN: 24AABCP1234A1Z5'
  });

  db.create('branches', {
    tenant_id: tenant.id,
    company_id: company.id,
    name: 'Head Office - Ahmedabad',
    code: 'AHM-HQ',
    branch_type: 'hq',
    manager_id: owner.id,
    address_line1: 'Shop No. 12, Navrangpura Complex',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    pincode: '380009',
    phone: '07926123456',
    email: 'info@patelretail.com',
    is_hq: true,
    status: 'active'
  });

  db.create('tax_slabs', {
    tenant_id: tenant.id,
    name: 'GST 18%',
    rate: 18.00,
    tax_system: 'gst',
    is_composite: true,
    components: [{ name: 'CGST', rate: 9 }, { name: 'SGST', rate: 9 }],
    is_default: true,
    status: 'active'
  });

  db.create('tax_slabs', {
    tenant_id: tenant.id,
    name: 'GST 12%',
    rate: 12.00,
    tax_system: 'gst',
    is_composite: true,
    components: [{ name: 'CGST', rate: 6 }, { name: 'SGST', rate: 6 }],
    is_default: false,
    status: 'active'
  });

  db.create('tax_slabs', {
    tenant_id: tenant.id,
    name: 'Tax Exempt',
    rate: 0.00,
    tax_system: 'none',
    is_composite: false,
    components: [],
    is_default: false,
    status: 'active'
  });

  db.create('currency_settings', {
    tenant_id: tenant.id,
    base_currency: 'INR',
    symbol: '₹',
    decimal_places: 2,
    date_format: 'DD/MM/YYYY',
    number_format: 'indian',
    multi_currency: false
  });

  const yearStart = new Date(new Date().getFullYear(), 3, 1); // April 1st
  const yearEnd = new Date(new Date().getFullYear() + 1, 2, 31); // March 31st
  db.create('fiscal_years', {
    tenant_id: tenant.id,
    label: `FY ${yearStart.getFullYear()}-${yearEnd.getFullYear().toString().slice(2)}`,
    start_date: yearStart.toISOString().split('T')[0],
    end_date: yearEnd.toISOString().split('T')[0],
    is_active: true,
    is_locked: false
  });

  db.create('industry_config', {
    tenant_id: tenant.id,
    industry_type: 'retail',
    enabled_modules: ['crm', 'inventory', 'sales', 'purchase', 'finance', 'hr', 'reports'],
    default_uom: 'Piece'
  });
  
  localStorage.setItem('smarthub_seeded_v2', 'true');
  console.log('✅ SmartHub ERP — Module 2 seeded');
}

function seedModule3Data(tenantParam, ownerParam) {
  const tenant = tenantParam || db.find('tenants', () => true)[0];
  const owner = ownerParam || db.find('users', u => u.email === 'rajesh@smarthub.com')[0];
  
  if (!tenant || !owner) return;

  // ── Module 3: CRM Data ─────────────────────────────────
  
  // Customers
  const customer1 = db.create('customers', {
    tenant_id: tenant.id,
    name: 'Reliance Retail Ltd.',
    customer_type: 'corporate',
    tax_id: '27AAACR1234A1Z1',
    email: 'procurement@reliance.com',
    phone: '022-24567890',
    website: 'https://www.relianceretail.com',
    address_line1: 'Reliance Corporate Park, Thane-Belapur Road',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    country: 'India',
    zip: '400701',
    status: 'active'
  });

  const customer2 = db.create('customers', {
    tenant_id: tenant.id,
    name: 'Adani Enterprises',
    customer_type: 'corporate',
    tax_id: '24AAACA1234A1Z2',
    email: 'info@adani.com',
    phone: '079-26565555',
    website: 'https://www.adani.com',
    address_line1: 'Adani Corporate House, SG Highway',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    zip: '382421',
    status: 'active'
  });

  // Leads
  db.create('leads', {
    tenant_id: tenant.id,
    first_name: 'Amit',
    last_name: 'Sharma',
    company_name: 'Sharma Electronics',
    email: 'amit@sharmaelec.com',
    phone: '9825012345',
    source: 'Google Search',
    status: 'new',
    assigned_to: owner.id,
    expected_value: 50000
  });

  db.create('leads', {
    tenant_id: tenant.id,
    first_name: 'Priya',
    last_name: 'Patel',
    company_name: 'Patel Distributors',
    email: 'priya@pateldist.com',
    phone: '9909011223',
    source: 'Referral',
    status: 'contacted',
    assigned_to: owner.id,
    expected_value: 120000
  });

  // Opportunities
  db.create('opportunities', {
    tenant_id: tenant.id,
    customer_id: customer1.id,
    title: 'Cloud ERP Implementation',
    amount: 500000,
    stage: 'proposal',
    probability: 60,
    expected_close_date: '2026-05-15'
  });

  db.create('opportunities', {
    tenant_id: tenant.id,
    customer_id: customer2.id,
    title: 'Hardware Upgrade Phase 1',
    amount: 150000,
    stage: 'discovery',
    probability: 20,
    expected_close_date: '2026-06-01'
  });

  // Interactions
  db.create('interactions', {
    tenant_id: tenant.id,
    related_to_type: 'customer',
    related_to_id: customer1.id,
    type: 'call',
    summary: 'Initial discovery call',
    content: 'Client interested in automating their warehouse operations.',
    performed_by: owner.id
  });

  localStorage.setItem('smarthub_seeded_v3', 'true');
  console.log('✅ SmartHub ERP — Module 3 seeded');
}

function seedModule4Data(tenantParam, ownerParam) {
  const tenant = tenantParam || db.find('tenants', () => true)[0];
  const owner = ownerParam || db.find('users', u => u.email === 'rajesh@smarthub.com')[0];
  const taxSlab = db.find('tax_slabs', t => t.name === 'GST 18%')[0];
  
  if (!tenant || !owner) return;

  // ── Module 4: Inventory Data ───────────────────────────
  
  // Categories
  const cat1 = db.create('categories', { tenant_id: tenant.id, name: 'Smartphones', code: 'SMT' });
  const cat2 = db.create('categories', { tenant_id: tenant.id, name: 'Laptops', code: 'LPT' });
  const cat3 = db.create('categories', { tenant_id: tenant.id, name: 'Accessories', code: 'ACC' });

  // Units of Measure (UoM)
  const uomPcs = db.create('uoms', { tenant_id: tenant.id, name: 'Piece', abbreviation: 'Pcs' });
  const uomBox = db.create('uoms', { tenant_id: tenant.id, name: 'Box', abbreviation: 'Box' });

  // Warehouses
  const whMain = db.create('warehouses', { 
    tenant_id: tenant.id, 
    name: 'Main Warehouse - Industrial Area', 
    code: 'M-WHS', 
    city: 'Ahmedabad',
    is_default: true 
  });
  const whRetail = db.create('warehouses', { 
    tenant_id: tenant.id, 
    name: 'Retail Outlet - CG Road', 
    code: 'R-OUT', 
    city: 'Ahmedabad',
    is_default: false 
  });

  // Products
  const prod1 = db.create('products', {
    tenant_id: tenant.id,
    name: 'iPhone 15 Pro 256GB',
    sku: 'IPH-15P-256',
    category_id: cat1.id,
    brand: 'Apple',
    uom_id: uomPcs.id,
    purchase_price: 110000,
    sale_price: 129990,
    min_stock_level: 5,
    tax_slab_id: taxSlab?.id || null,
    status: 'active'
  });

  const prod2 = db.create('products', {
    tenant_id: tenant.id,
    name: 'MacBook Air M2 13-inch',
    sku: 'MAC-AIR-M2',
    category_id: cat2.id,
    brand: 'Apple',
    uom_id: uomPcs.id,
    purchase_price: 95000,
    sale_price: 114990,
    min_stock_level: 3,
    tax_slab_id: taxSlab?.id || null,
    status: 'active'
  });

  // Stock Levels
  db.create('stock_levels', {
    tenant_id: tenant.id,
    product_id: prod1.id,
    warehouse_id: whMain.id,
    current_quantity: 12,
    reserved_quantity: 2,
    opening_quantity: 10
  });

  db.create('stock_levels', {
    tenant_id: tenant.id,
    product_id: prod2.id,
    warehouse_id: whMain.id,
    current_quantity: 8,
    reserved_quantity: 0,
    opening_quantity: 5
  });

  // Stock Ledger (Initial Entries)
  db.create('stock_ledger', {
    tenant_id: tenant.id,
    product_id: prod1.id,
    warehouse_id: whMain.id,
    transaction_type: 'adjustment',
    quantity_change: 12,
    summary: 'Opening Stock Entry',
    performed_by: owner.id
  });

  localStorage.setItem('smarthub_seeded_v4', 'true');
  console.log('✅ SmartHub ERP — Module 4 seeded');
}

function seedModule5Data(tenantParam, ownerParam) {
  const tenant = tenantParam || db.find('tenants', () => true)[0];
  const owner = ownerParam || db.find('users', u => u.email === 'rajesh@smarthub.com')[0];
  const customer1 = db.find('customers', c => c.name === 'Reliance Retail Ltd.')[0];
  const prod1 = db.find('products', p => p.sku === 'IPH-15P-256')[0];
  
  if (!tenant || !owner || !customer1 || !prod1) return;

  // ── Module 5: Sales Data ──────────────────────────────
  
  // Sales Orders
  const so1 = db.create('sales_orders', {
    tenant_id: tenant.id,
    customer_id: customer1.id,
    order_number: 'SO-2025-001',
    order_date: '2025-03-12',
    status: 'confirmed',
    total_amount: 110161.02,
    tax_amount: 19828.98,
    grand_total: 129990.00,
    items: [
      {
        product_id: prod1.id,
        product_name: prod1.name,
        quantity: 1,
        unit_price: 110161.02,
        tax_rate: 18,
        tax_amount: 19828.98,
        total: 129990.00
      }
    ]
  });

  // Invoices
  const inv1 = db.create('invoices', {
    tenant_id: tenant.id,
    order_id: so1.id,
    customer_id: customer1.id,
    invoice_number: 'INV-2025-001',
    invoice_date: '2025-03-12',
    due_date: '2025-03-27',
    status: 'partial',
    total_amount: 110161.02,
    tax_amount: 19828.98,
    grand_total: 129990.00,
    amount_paid: 50000.00,
    items: [
      {
        product_id: prod1.id,
        product_name: prod1.name,
        quantity: 1,
        unit_price: 110161.02,
        tax_rate: 18,
        tax_amount: 19828.98,
        total: 129990.00
      }
    ]
  });

  // Payments
  db.create('payments', {
    tenant_id: tenant.id,
    invoice_id: inv1.id,
    payment_date: '2025-03-12',
    amount: 50000.00,
    method: 'bank_transfer',
    reference_no: 'TXN123456789'
  });

  localStorage.setItem('smarthub_seeded_v5', 'true');
  console.log('✅ SmartHub ERP — Module 5 seeded');
}

