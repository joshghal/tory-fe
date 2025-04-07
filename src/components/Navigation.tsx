import Image from 'next/image';
import Tory from '@public/tory-logo.png';
import Link from 'next/link';

const Navigation = () => {
  return (
    <nav className="flex items-center justify-between w-full max-w-[1160px]">
      <Link href="/" className="flex items-center gap-1">
        <Image src={Tory.src} alt="tory-logo" width={36} height={36} />
        <h1 className="text-2xl text-gray-900 dark:text-white [font-family:var(--font-press-start)]">
          TORY
        </h1>

      </Link>
    </nav>
  );
};

export default Navigation;