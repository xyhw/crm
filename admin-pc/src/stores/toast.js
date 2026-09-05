import { defineStore } from 'pinia';

let seq = 0;

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [],
  }),
  actions: {
    push(message, type = 'info') {
      const id = ++seq;
      this.items.push({ id, message, type });
      setTimeout(() => this.remove(id), 3200);
    },
    success(message) {
      this.push(message, 'success');
    },
    error(message) {
      this.push(message, 'error');
    },
    remove(id) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
