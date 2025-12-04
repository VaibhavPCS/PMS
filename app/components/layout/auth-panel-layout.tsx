import React from 'react';

interface AuthPanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout component for all authentication screens
 * Features a two-panel design:
 * - Left panel: Branding with logo and circular image collage
 * - Right panel: Form content (passed as children)
 */
const AuthPanelLayout: React.FC<AuthPanelLayoutProps> = ({ children }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'var(--Linear-Gradient-for-Login, linear-gradient(180deg, rgba(0, 122, 255, 0.40) 0%, rgba(242, 118, 27, 0.40) 100%))',
        backgroundSize: 'cover'
      }}
    >
      <div className="w-full max-w-[975px] min-h-[650px] md:h-[650px] bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row gap-2.5 p-2.5">
        {/* Left Panel - Branding (Hidden on mobile) */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-sky-200 to-sky-300 rounded-2xl relative overflow-hidden">
          {/* Logo and Organization Name */}
          <div className="absolute left-1/2 -translate-x-1/2 top-7 flex items-center gap-6 z-10">
            <div className="w-[60px] h-[60px] relative">
              <img
                src="/pcs_logo.jpg"
                alt="PCS Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-[28px] font-normal leading-normal text-transparent bg-clip-text bg-gradient-to-r from-[#f2761b] to-black drop-shadow-md whitespace-pre">
              <p className="mb-0">PCS Management{'\n'}System Tracker</p>
            </div>
          </div>

          {/* Circular Image Collage - Reduced by 20% and centered */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[150px] w-[300px] h-[301px]">
            {/* Top right image - Ellipse 1167 */}
            <div className="absolute left-[173.46px] top-[4.1px] w-[122.58px] h-[155.81px]">
              <img
                src="/assets/6ca044e807ecaca1f18f8eef3afff6eb18b951f0.png"
                alt=""
                className="block max-w-none w-full h-full"
                style={{ width: '122.58px', height: '155.81px' }}
              />
            </div>
            {/* Top left image - Vector 28 */}
            <div className="absolute left-[20.97px] top-0 w-[170.45px] h-[107.93px]">
              <img
                src="/assets/6cee9e11183574caacaf33e25144b32c38ab87ef.png"
                alt=""
                className="block max-w-none w-full h-full"
                style={{ width: '170.45px', height: '107.93px' }}
              />
            </div>
            {/* Bottom left image - Vector 29 (optimized version) - Scaled 80% */}
            <div
              className="absolute flex items-center justify-center left-[-33.44px] top-[63.26px]"
              style={{
                height: '0px',
                width: '0px'
              }}
            >
              <div className="flex-none" style={{ transform: 'rotate(-71.125deg)' }}>
                <div
                  className="relative w-[170.45px] h-[107.93px]"
                  style={{
                    top: '6.63rem',
                    left: '-4.32rem'
                  }}
                >
                  <img
                    alt=""
                    className="block max-w-none w-full h-full"
                    src="/assets/2267c615c2558e13677cc9fade0ba92efd0fa732.png"
                    style={{
                      width: '170.45px',
                      height: '107.93px'
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Bottom center image - Vector 30 (optimized with precise implementation) - Scaled 80% */}
            <div
              className="absolute flex items-center justify-center left-[28.06px] top-[159.06px]"
              style={{
                height: 'calc(0px)',
                width: 'calc(0px)'
              }}
            >
              <div className="flex-none" style={{ transform: 'rotate(-143.789deg)' }}>
                <div
                  className="relative w-[170.45px] h-[108.85px]"
                  style={{
                    bottom: '1.04rem',
                    right: '8.7rem'
                  }}
                >
                  <img
                    src="/assets/edc6673e15b60b7959b8155d92f115fd929af09d.png"
                    alt=""
                    className="block max-w-none w-full h-full"
                    style={{ width: '170.45px', height: '108.85px' }}
                  />
                </div>
              </div>
            </div>
            {/* Right image - Vector 31 (optimized with precise implementation) - Scaled 80% */}
            <div
              className="absolute flex items-center justify-center left-[139.93px] top-[109.13px]"
              style={{
                height: 'calc(0px)',
                width: 'calc(0px)'
              }}
            >
              <div className="flex-none" style={{ transform: 'rotate(142.535deg)' }}>
                <div
                  className="relative w-[170.45px] h-[109.56px]"
                  style={{
                    bottom: '8.58rem',
                    right: '1.68rem'
                  }}
                >
                  <img
                    src="/assets/e8dad36f05f419a4be25e9299f8531ab9c91e7e7.png"
                    alt=""
                    className="block max-w-none w-full h-full"
                    style={{ width: '170.45px', height: '109.56px' }}
                  />
                </div>
              </div>
            </div>
            {/* Center circle to create ring effect - Scaled 80% */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-sky-200 to-sky-300 rounded-full"
              style={{ width: '112px', height: '112px' }}
            />
          </div>
        </div>

        {/* Right Panel - Form Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="w-full md:w-[360px] h-full flex flex-col justify-center overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-4 md:px-2">
            <div className="flex flex-col gap-6 py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPanelLayout;
