import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Camera, Download, Trash2, ArrowLeft, FlipHorizontal } from 'lucide-react';

export default function PhotoboothHome() {
  const [darkMode, setDarkMode] = useState(true);
  const [stage, setStage] = useState('home'); // home, booth
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([null, null, null, null]);
  const [borderColor, setBorderColor] = useState('#D4AF37');
  const [currentFilter, setCurrentFilter] = useState('none');
  const [flipped, setFlipped] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [bgPattern, setBgPattern] = useState('dots');
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Detect if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filters = [
    { name: 'None', value: 'none', style: 'none' },
    { name: 'B&W', value: 'grayscale', style: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia', style: 'sepia(100%)' },
    { name: 'Invert', value: 'invert', style: 'invert(100%)' },
    { name: 'Warm', value: 'warm', style: 'sepia(50%) saturate(150%)' },
    { name: 'Cool', value: 'cool', style: 'hue-rotate(180deg) saturate(120%)' },
  ];

  const templates = [
    { name: '3 Photos', value: 'classic', count: 3 },
    { name: '4 Photos', value: 'quad', count: 4 },
    { name: '2 Photos', value: 'duo', count: 2 },
  ];

  const bgPatterns = [
    { name: 'Dots', value: 'dots' },
    { name: 'Stars', value: 'stars' },
    { name: 'Hearts', value: 'hearts' },
    { name: 'Solid', value: 'solid' },
  ];

  // Update photos array when template changes
  useEffect(() => {
    const template = templates.find(t => t.value === selectedTemplate);
    setPhotos(new Array(template.count).fill(null));
  }, [selectedTemplate]);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      });
      setStream(mediaStream);
      setStage('booth');
      
      // Wait for next frame to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => console.error('Play error:', err));
        }
      }, 100);
    } catch (err) {
      alert('Camera access denied. Please enable camera permissions.');
      console.error(err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setStage('home');
    const template = templates.find(t => t.value === selectedTemplate);
    setPhotos(new Array(template.count).fill(null));
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Capture photo
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Apply filter
    if (currentFilter !== 'none') {
      const filterStyle = filters.find(f => f.value === currentFilter)?.style;
      ctx.filter = filterStyle;
    }

    // Handle flip
    if (flipped) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0);
    }
    
    const imageUrl = canvas.toDataURL('image/png');
    
    // Add to first empty slot
    const emptyIndex = photos.findIndex(p => p === null);
    if (emptyIndex !== -1) {
      const newPhotos = [...photos];
      newPhotos[emptyIndex] = imageUrl;
      setPhotos(newPhotos);
    }
  };

  // Clear photo
  const clearPhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos[index] = null;
    setPhotos(newPhotos);
  };

  // Clear all
  const clearAll = () => {
    const template = templates.find(t => t.value === selectedTemplate);
    setPhotos(new Array(template.count).fill(null));
  };

  // Draw background pattern
  const drawPattern = (ctx, width, height) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (bgPattern === 'solid') return;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    
    if (bgPattern === 'dots') {
      for (let x = 10; x < width; x += 40) {
        for (let y = 10; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgPattern === 'stars') {
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        ctx.fillRect(x, y, size, size);
      }
    } else if (bgPattern === 'hearts') {
      for (let x = 20; x < width; x += 60) {
        for (let y = 20; y < height; y += 60) {
          ctx.font = '16px serif';
          ctx.fillText('♥', x, y);
        }
      }
    }
  };

  // Download template
  const downloadTemplate = () => {
    if (!photos.some(p => p !== null)) {
      alert('Take at least one photo first!');
      return;
    }

    const templateCanvas = document.createElement('canvas');
    const stripWidth = 500;
    const photoCount = photos.length;
    
    // Different dimensions for mobile vs desktop
    let photoWidth, photoHeight;
    if (isMobile) {
      // Mobile: Portrait frames (taller)
      photoWidth = stripWidth - 60; // 440px
      photoHeight = photoWidth * 1.2; // 528px - portrait ratio
    } else {
      // Desktop: Landscape frames (wider)
      photoWidth = stripWidth - 60; // 440px
      photoHeight = 350; // Original landscape ratio
    }
    
    const spacing = photoHeight + 80;
    const stripHeight = 200 + (photoCount * spacing);
    
    templateCanvas.width = stripWidth;
    templateCanvas.height = stripHeight;
    const ctx = templateCanvas.getContext('2d');

    // Background with pattern
    drawPattern(ctx, stripWidth, stripHeight);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Happy Moments', stripWidth / 2, 60);

    // Draw photos
    const photoPromises = photos.map((photo, index) => {
      return new Promise((resolve) => {
        const y = 120 + (index * spacing);
        
        if (!photo) {
          // Draw empty frame
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 8;
          ctx.strokeRect(30, y, stripWidth - 60, photoHeight);
          resolve();
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          // Border
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 8;
          ctx.strokeRect(30, y, stripWidth - 60, photoHeight);
          
          // Photo (cover - fills frame and crops)
          const frameWidth = stripWidth - 60;
          const frameHeight = photoHeight;
          const imgAspect = img.width / img.height;
          const frameAspect = frameWidth / frameHeight;
          
          let drawWidth, drawHeight, offsetX, offsetY;
          
          // Calculate to cover the frame (may crop sides or top/bottom)
          if (imgAspect > frameAspect) {
            // Image is wider - fit height and crop sides
            drawHeight = frameHeight;
            drawWidth = img.width * (frameHeight / img.height);
            offsetX = -(drawWidth - frameWidth) / 2;
            offsetY = 0;
          } else {
            // Image is taller - fit width and crop top/bottom
            drawWidth = frameWidth;
            drawHeight = img.height * (frameWidth / img.width);
            offsetX = 0;
            offsetY = -(drawHeight - frameHeight) / 2;
          }
          
          // Clip to frame boundaries to prevent overflow
          ctx.save();
          ctx.beginPath();
          ctx.rect(30, y, frameWidth, frameHeight);
          ctx.clip();
          ctx.drawImage(img, 30 + offsetX, y + offsetY, drawWidth, drawHeight);
          ctx.restore();
          
          resolve();
        };
        img.src = photo;
      });
    });

    Promise.all(photoPromises).then(() => {
      // Footer text
      const date = new Date().toLocaleDateString();
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(date, stripWidth / 2, stripHeight - 30);
      
      const link = document.createElement('a');
      link.download = `photobooth-${Date.now()}.png`;
      link.href = templateCanvas.toDataURL('image/png');
      link.click();
    });
  };

  // Get background style for preview
  const getPreviewBgStyle = () => {
    if (bgPattern === 'solid') return {};
    
    if (bgPattern === 'dots') {
      return {
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 2px, transparent 2px)',
        backgroundSize: '40px 40px'
      };
    } else if (bgPattern === 'stars') {
      return {
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      };
    } else if (bgPattern === 'hearts') {
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='20' y='30' fill='rgba(255,255,255,0.15)' font-size='20'%3E♥%3C/text%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      };
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`absolute top-4 right-4 md:top-8 md:right-8 p-3 rounded-full transition-all duration-300 hover:scale-110 z-50 ${
          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
      >
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Home Screen */}
      {stage === 'home' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center space-y-12 animate-fadeIn">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-light tracking-wider">PHOTOBOOTH</h1>
              <p className="text-base md:text-lg font-light opacity-70">Capture your moments</p>
            </div>

            <button
              onClick={startCamera}
              className={`flex items-center space-x-3 px-8 md:px-12 py-4 text-base md:text-lg font-light tracking-wide border-2 rounded-full transition-all duration-300 hover:scale-105 ${
                darkMode
                  ? 'border-white hover:bg-white hover:text-black'
                  : 'border-black hover:bg-black hover:text-white'
              }`}
            >
              <Camera size={24} />
              <span>START</span>
            </button>
          </div>
        </div>
      )}

      {/* Photobooth Screen */}
      {stage === 'booth' && (
        <div className="min-h-screen p-4 md:p-8">
          {/* Back Button */}
          <button
            onClick={stopCamera}
            className={`mb-4 flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
            }`}
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Left Side - Camera */}
            <div className="flex-1">
              <div className={`relative border-2 rounded-lg overflow-hidden mb-4 transition-all duration-300 ${
                darkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto transition-all duration-500 bg-gray-900"
                  style={{ 
                    filter: filters.find(f => f.value === currentFilter)?.style,
                    transform: flipped ? 'scaleX(-1)' : 'scaleX(1)',
                    minHeight: '400px'
                  }}
                  onLoadedMetadata={(e) => {
                    e.target.play();
                  }}
                />
                
                {/* Flip Button Overlay */}
                <button
                  onClick={() => setFlipped(!flipped)}
                  className="absolute top-4 right-4 p-3 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all duration-300 hover:scale-110"
                >
                  <FlipHorizontal size={20} className="text-white" />
                </button>
              </div>

              {/* Filters */}
              <div className="mb-4">
                <p className="text-xs md:text-sm font-light opacity-70 mb-3">FILTERS</p>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setCurrentFilter(filter.value)}
                      className={`px-3 md:px-4 py-2 text-xs md:text-sm font-light border rounded-full transition-all duration-300 hover:scale-105 ${
                        currentFilter === filter.value
                          ? darkMode
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-black'
                          : darkMode
                          ? 'border-white hover:bg-white hover:text-black'
                          : 'border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capture Button */}
              <button
                onClick={capturePhoto}
                disabled={!photos.includes(null)}
                className={`w-full flex items-center justify-center space-x-3 px-6 md:px-8 py-4 text-base md:text-lg font-light tracking-wide border-2 rounded-full transition-all duration-300 hover:scale-105 ${
                  !photos.includes(null)
                    ? 'opacity-50 cursor-not-allowed'
                    : darkMode
                    ? 'border-white hover:bg-white hover:text-black'
                    : 'border-black hover:bg-black hover:text-white'
                }`}
              >
                <Camera size={24} />
                <span>CAPTURE ({photos.filter(p => p === null).length} left)</span>
              </button>
            </div>

            {/* Right Side - Photo Strip Template */}
            <div className="w-full lg:w-80">
              <p className="text-xs md:text-sm font-light opacity-70 mb-3">PHOTO STRIP</p>
              
              {/* Template Selection */}
              <div className="mb-4">
                <p className="text-xs font-light opacity-70 mb-2">TEMPLATE</p>
                <div className="flex gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.value}
                      onClick={() => setSelectedTemplate(template.value)}
                      className={`px-3 py-1.5 text-xs font-light border rounded-full transition-all duration-300 hover:scale-105 ${
                        selectedTemplate === template.value
                          ? darkMode
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-black'
                          : darkMode
                          ? 'border-white hover:bg-white hover:text-black'
                          : 'border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Pattern Selection */}
              <div className="mb-4">
                <p className="text-xs font-light opacity-70 mb-2">BACKGROUND</p>
                <div className="flex gap-2">
                  {bgPatterns.map((pattern) => (
                    <button
                      key={pattern.value}
                      onClick={() => setBgPattern(pattern.value)}
                      className={`px-3 py-1.5 text-xs font-light border rounded-full transition-all duration-300 hover:scale-105 ${
                        bgPattern === pattern.value
                          ? darkMode
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-black'
                          : darkMode
                          ? 'border-white hover:bg-white hover:text-black'
                          : 'border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      {pattern.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Strip Container */}
              <div 
                className="rounded-lg p-4 md:p-6 mb-4 transition-all duration-500"
                style={{ 
                  backgroundColor: '#000000',
                  ...getPreviewBgStyle()
                }}
              >
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="text-xl md:text-2xl font-serif italic text-white">Happy Moments</h2>
                </div>

                {/* Photo Slots */}
                <div className="space-y-3">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative rounded overflow-hidden transition-all duration-500 hover:scale-105"
                      style={{ 
                        border: `4px solid ${borderColor}`,
                        paddingBottom: isMobile ? '120%' : '80%', // Portrait on mobile, landscape on desktop
                        backgroundColor: '#1a1a1a',
                        position: 'relative'
                      }}
                    >
                      {photo ? (
                        <>
                          <img 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="absolute inset-0 w-full h-full object-cover" 
                          />
                          <button
                            onClick={() => clearPhoto(index)}
                            className="absolute top-1 right-1 p-1.5 bg-black bg-opacity-70 rounded-full hover:bg-opacity-90 transition-all duration-300 hover:scale-110 z-10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera size={20} className="opacity-20 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="text-center mt-4">
                  <p className="text-xs text-white opacity-70">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Color Picker */}
              <div className="mb-4">
                <p className="text-xs md:text-sm font-light opacity-70 mb-3">BORDER COLOR</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-lg cursor-pointer border-2 transition-all duration-300 hover:scale-110"
                    style={{ borderColor: darkMode ? '#374151' : '#d1d5db' }}
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className={`flex-1 px-3 md:px-4 py-2 rounded-lg border-2 bg-transparent font-mono text-xs md:text-sm transition-all duration-300 ${
                      darkMode ? 'border-gray-700 focus:border-white' : 'border-gray-300 focus:border-black'
                    }`}
                    placeholder="#D4AF37"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={downloadTemplate}
                  className={`w-full flex items-center justify-center space-x-2 px-4 md:px-6 py-3 text-sm md:text-base font-light tracking-wide border-2 rounded-full transition-all duration-300 hover:scale-105 ${
                    darkMode
                      ? 'border-white hover:bg-white hover:text-black'
                      : 'border-black hover:bg-black hover:text-white'
                  }`}
                >
                  <Download size={20} />
                  <span>DOWNLOAD</span>
                </button>
                
                <button
                  onClick={clearAll}
                  className={`w-full px-4 md:px-6 py-3 text-sm md:text-base font-light tracking-wide opacity-50 hover:opacity-100 transition-all duration-300`}
                >
                  CLEAR ALL
                </button>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}