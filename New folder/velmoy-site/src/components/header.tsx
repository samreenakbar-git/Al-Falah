import Image from 'next/image'
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="nav">
      <div className="nav-container">
        <div className="nav-contant">
          <Link href="/" className="nav-logo-wraper w-inline-block w--current">
            <Image
              src="/velmoy-logo.png"
              alt="VELMOY DEVELOPMENT"
              className="nav-logo-img"
              width={212}
              height={45}
              priority
            />
          </Link>
          <div className="nav-link-wraper-copy">
            <Link href="/" className="nav-link w--current">
              Home
            </Link>
            <Link href="#" className="nav-link">
              Projekte
            </Link>
            <Link href="#" className="nav-link">
              Leistungen
            </Link>
            <Link href="#" className="nav-link">
              Kundenstimmen
            </Link>
            <Link href="#" className="nav-link">
              Partner
            </Link>
            <Link href="#" className="nav-link">
              Über uns
            </Link>
            <Link href="#faqs" className="nav-link">
              FAQ
            </Link>
          </div>
          <div className="div-block">
            <Link href="#" className="btn-wraper w-inline-block">
              <div className="circle border">
                <img
                  src="https://cdn.prod.website-files.com/69520a2c277733cc29083e37/695263b4c33ebffff4fb687f_Arrow%201%20(1).svg"
                  alt="Arrow"
                  className="arrow"
                />
              </div>
              <div className="btn-para">Kontaktire Uns</div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

