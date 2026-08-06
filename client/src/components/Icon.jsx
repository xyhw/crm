import {
  WapHomeO,
  Search,
  Edit,
  GoldCoinO,
  UserO,
  ShopO,
  Exchange,
  Arrow,
  LabelO,
  ClockO,
  BillO,
  Records,
  BagO,
  Bag,
  Close,
  OrdersO,
  Success,
  ServiceO,
  SettingO,
  FriendsO,
  NotesO,
  CommentO,
  StarO,
  PointGiftO,
  TodoList,
  HotelO,
  Contact,
  LocationO,
  PhoneO,
  Bell,
  EnvelopO,
  BullhornO,
  GiftO,
  AwardO,
} from '@react-vant/icons';

const ICON_MAP = {
  'wap-home-o': WapHomeO,
  search: Search,
  edit: Edit,
  'gold-coin-o': GoldCoinO,
  'user-o': UserO,
  'shop-o': ShopO,
  exchange: Exchange,
  arrow: Arrow,
  'label-o': LabelO,
  'clock-o': ClockO,
  'alarm-o': ClockO,
  'records-o': BillO,
  records: Records,
  'bag-o': BagO,
  bag: Bag,
  close: Close,
  'orders-o': OrdersO,
  success: Success,
  'service-o': ServiceO,
  'setting-o': SettingO,
  'friends-o': FriendsO,
  'notes-o': NotesO,
  'comment-o': CommentO,
  'star-o': StarO,
  'point-gift-o': PointGiftO,
  'todo-list-o': TodoList,
  'hotel-o': HotelO,
  contact: Contact,
  'location-o': LocationO,
  'phone-o': PhoneO,
  bell: Bell,
  'envelop-o': EnvelopO,
  'bullhorn-o': BullhornO,
  'gift-o': GiftO,
  'award-o': AwardO,
};

export default function Icon({ name, size = 16, color, style, className }) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) return null;
  return (
    <Cmp
      width={size}
      height={size}
      style={{ color, ...style }}
      className={className}
    />
  );
}
