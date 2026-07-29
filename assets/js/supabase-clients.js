/* ============================================================
   ZORA — Supabase connection + data helpers
   ------------------------------------------------------------
   This is already wired up to your live Supabase project
   (jvadqrzlmxfzovifovpb) — tables, storage bucket, security
   policies and your 20 products are already created and seeded.

   ONE thing you still need to do in the Supabase dashboard:
   Authentication → Sign In / Providers → Email → turn OFF
   "Confirm email", so people can sign up and start shopping
   immediately without clicking a verification link.
   ============================================================ */
const SUPABASE_URL = 'https://jvadqrzlmxfzovifovpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YWRxcnpsbXhmem92aWZvdnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNzI1NTIsImV4cCI6MjEwMDY0ODU1Mn0.7P3IjeQ9E1wlY6kGEZulcBSPeNmj8z1nmZdks6HNgNY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ZoraDB = {
  supabase: sb,

  // ---------------- AUTH ----------------
  async signUp(email, password, fullName, phone){
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, phone: phone },
        emailRedirectTo: window.location.origin + '/verify.html'
      }
    });
    if(error) throw error;
    // If "Confirm email" is OFF in Supabase, a session comes back right
    // away and the person is signed in immediately. If it's ON, no session
    // is returned yet — they need to click the link in their inbox first,
    // which lands them on verify.html.
    return { ...data, needsEmailConfirmation: !data.session };
  },
  async signIn(email, password){
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw error;
    return data;
  },
  async verifyOtp(email, token){
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'signup' });
    if(error) throw error;
    return data;
  },
  async resendOtp(email){
    const { error } = await sb.auth.resend({ type: 'signup', email });
    if(error) throw error;
  },
  async signOut(){
    await sb.auth.signOut();
  },
  async getUser(){
    const { data } = await sb.auth.getUser();
    return data.user;
  },
  async getSession(){
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  // ---------------- PROFILE ----------------
  async getProfile(userId){
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if(error) throw error;
    return data;
  },
  async isAdmin(userId){
    const profile = await this.getProfile(userId);
    return !!(profile && profile.is_admin);
  },

  // ---------------- ADDRESSES ----------------
  async saveAddress(userId, address){
    const { data, error } = await sb.from('addresses').insert({ user_id: userId, ...address }).select().single();
    if(error) throw error;
    return data;
  },
  async getAddresses(userId){
    const { data, error } = await sb.from('addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(error) throw error;
    return data;
  },

  // ---------------- ORDERS ----------------
  async createOrder({ userId, items, address, total, notes }){
    const orderNumber = 'ZR' + Date.now().toString().slice(-8);
    const { data: order, error } = await sb.from('orders').insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'placed',
      total,
      address,
      notes: notes || null
    }).select().single();
    if(error) throw error;

    const orderItems = items.map(i => ({
      order_id: order.id,
      product_id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty
    }));
    const { error: itemsError } = await sb.from('order_items').insert(orderItems);
    if(itemsError) throw itemsError;

    return order;
  },
  async getMyOrders(userId){
    const { data, error } = await sb.from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if(error) throw error;
    return data;
  },

  // ---------------- ADMIN: ORDERS ----------------
  async getAllOrders(){
    const { data, error } = await sb.from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if(error) throw error;
    return data;
  },
  async updateOrderStatus(orderId, status){
    const { error } = await sb.from('orders').update({ status }).eq('id', orderId);
    if(error) throw error;
  },

  // ---------------- ADMIN: PRODUCTS ----------------
  async getProducts(){
    const { data, error } = await sb.from('products').select('*').order('name');
    if(error) throw error;
    return data;
  },
  async addProduct(product){
    const { data, error } = await sb.from('products').insert(product).select().single();
    if(error) throw error;
    return data;
  },
  async updateProduct(id, patch){
    const { error } = await sb.from('products').update(patch).eq('id', id);
    if(error) throw error;
  },
  async deleteProduct(id){
    const { error } = await sb.from('products').delete().eq('id', id);
    if(error) throw error;
  },
  async uploadProductImage(file, path){
    const { error } = await sb.storage.from('product-images').upload(path, file, { upsert: true });
    if(error) throw error;
    const { data } = sb.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  }
};

window.ZoraDB = ZoraDB;
