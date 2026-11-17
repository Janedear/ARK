// === MESSAGE ACKNOWLEDGE ===
const MsgAck = {
  _KEY: 'msg_acks',
  _data() { return Store.get(this._KEY, {}); },
  isAcked(id) { if (!id) return false; return !!this._data()[id]; },
  getCount(id) { if (!id) return 0; return this._data()[id] || 0; },
  toggle(id) {
    if (!id) return;
    const d = this._data();
    if (d[id]) {
      delete d[id];
    } else {
      d[id] = (d[id] || 0) + 1;
    }
    Store.set(this._KEY, d);
  },
  clear() { Store.set(this._KEY, {}); }
};

