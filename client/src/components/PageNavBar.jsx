import { NavBar } from 'react-vant';
import { ArrowLeft } from '@react-vant/icons';

export default function PageNavBar({ title, onClickLeft, ...rest }) {
  return (
    <NavBar
      title={title}
      leftArrow={<ArrowLeft width={20} height={20} />}
      onClickLeft={onClickLeft}
      safeAreaInsetTop
      {...rest}
    />
  );
}
