// ============================================================
// SmartHub ERP — Data Store (localStorage-based)
// ============================================================

const TENANT_PREFIX = 'smarthub_';

class DataStore {
  constructor() {
    this.tenantId = null;
  }

  setTenant(tenantId) {
    this.tenantId = tenantId;
  }

  _key(collection) {
    return `${TENANT_PREFIX}${collection}`;
  }

  // Get all records from a collection
  getAll(collection) {
    try {
      const data = localStorage.getItem(this._key(collection));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Get a single record by ID
  getById(collection, id) {
    const all = this.getAll(collection);
    return all.find(item => item.id === id) || null;
  }

  // Find records matching a predicate
  find(collection, predicate) {
    return this.getAll(collection).filter(predicate);
  }

  // Find first record matching predicate
  findOne(collection, predicate) {
    return this.getAll(collection).find(predicate) || null;
  }

  // Create a new record
  create(collection, data) {
    const all = this.getAll(collection);
    const record = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (this.tenantId) {
      record.tenant_id = this.tenantId;
    }
    all.push(record);
    localStorage.setItem(this._key(collection), JSON.stringify(all));
    return record;
  }

  // Update a record by ID
  update(collection, id, updates) {
    const all = this.getAll(collection);
    const index = all.findIndex(item => item.id === id);
    if (index === -1) return null;
    all[index] = {
      ...all[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(this._key(collection), JSON.stringify(all));
    return all[index];
  }

  // Delete a record by ID
  delete(collection, id) {
    const all = this.getAll(collection);
    const filtered = all.filter(item => item.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(this._key(collection), JSON.stringify(filtered));
    return true;
  }

  // Replace entire collection
  setAll(collection, data) {
    localStorage.setItem(this._key(collection), JSON.stringify(data));
  }

  // Count records
  count(collection, predicate = null) {
    const all = this.getAll(collection);
    return predicate ? all.filter(predicate).length : all.length;
  }

  // Generate UUID
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Clear all data
  clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(TENANT_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // Check if seeded
  isSeeded() {
    return localStorage.getItem(`${TENANT_PREFIX}seeded`) === 'true';
  }

  markSeeded() {
    localStorage.setItem(`${TENANT_PREFIX}seeded`, 'true');
  }
}

export const db = new DataStore();
export default db;
