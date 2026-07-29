/* ============================================================
   ZORA — Cart system
   Stored in localStorage so it survives page navigation and
   reloads, without needing a server round-trip for every click.
   Each line item: { id, name, price, qty }
   Combo line items get a unique generated id (combo-<timestamp>)
   and carry a `comboItems` array describing what's inside them.
   ============================================================ */
const Cart = {
  KEY: 'zora_cart_v1',

  get(){
    try{
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  },

  _save(items){
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(item, qty = 1){
    const items = this.get();
    const existing = items.find(i => i.id === item.id);
    if(existing){
      existing.qty += qty;
    }else{
      items.push({ id: item.id, name: item.name, price: item.price, qty });
    }
    this._save(items);
  },

  addCombo(comboItem){
    // Combos are always their own line — never merged with anything else.
    const items = this.get();
    items.push(comboItem);
    this._save(items);
  },

  updateQty(id, qty){
    let items = this.get();
    if(qty <= 0){
      items = items.filter(i => i.id !== id);
    }else{
      const it = items.find(i => i.id === id);
      if(it) it.qty = qty;
    }
    this._save(items);
  },

  remove(id){
    this._save(this.get().filter(i => i.id !== id));
  },

  clear(){
    this._save([]);
  },

  count(){
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  total(){
    return this.get().reduce((sum, i) => sum + (i.price * i.qty), 0);
  },

  updateBadge(){
    const n = this.count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  }
};

window.Cart = Cart;
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
