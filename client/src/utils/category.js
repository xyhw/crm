import { resolveIcon } from '../components/Icon';
import { categoryIconName, SUPPLIER_CATEGORIES } from '../constants';

export function resolveCategoryIcon(item) {
  if (!item) return 'apps-o';
  const raw = item.categoryIcon || item.category_icon;
  if (raw && resolveIcon(raw)) return raw;
  return categoryIconName(item.categoryId ?? item.category);
}

export function categoryPickerColumns() {
  return SUPPLIER_CATEGORIES.map((c) => ({ text: c.label, value: c.value }));
}

export function findCategoryLabel(value) {
  return SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label || '未知';
}
