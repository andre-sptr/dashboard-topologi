import { motion } from 'framer-motion';
import { useTopologyStore } from '../store/topologyStore';

interface DraggableSvgItemProps {
  element: {
    id: string;
    type: string;
    props: string; // JSON string
    x: number;
    y: number;
    transform: string | null;
  };
  index: number;
}

const DraggableSvgItem = ({ element, index }: DraggableSvgItemProps) => {
  const updateElementPosition = useTopologyStore((state) => state.updateElementPosition);
  
  const props = JSON.parse(element.props);
  
  const handleDragEnd = async (_: any, info: any) => {
    // Note: info.offset is in screen coordinates, we need to consider zoom level 
    // for absolute precision, but for simple drag it works.
    const newX = element.x + info.offset.x;
    const newY = element.y + info.offset.y;
    
    // Update local state (Optimistic)
    updateElementPosition(element.id, newX, newY);
    
    // Update Database
    try {
      await fetch(`http://localhost:3002/api/elements/${element.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: newX, y: newY })
      });
    } catch (error) {
      console.error('Failed to sync position:', error);
    }
  };

  const renderElement = () => {
    const { type } = element;
    const { x, y, transform, ...otherProps } = props;

    const commonProps = {
      ...otherProps,
      className: "transition-colors duration-300",
    };

    switch (type) {
      case 'rect':
        return <rect {...commonProps} width={props.width} height={props.height} />;
      case 'circle':
        return <circle {...commonProps} r={props.r} />;
      case 'ellipse':
        return <ellipse {...commonProps} rx={props.rx} ry={props.ry} />;
      case 'text':
        return <text {...commonProps}>{props.content || ''}</text>;
      case 'path':
        return <path {...commonProps} d={props.d} />;
      default:
        return null;
    }
  };

  return (
    <motion.g
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0, rotate: -10 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: 0,
        x: element.x,
        y: element.y,
      }}
      transition={{ 
        delay: Math.min(index * 0.005, 2), // Stagger but cap at 2s
        duration: 0.5,
        type: 'spring',
        stiffness: 100
      }}
      whileHover={{ 
        filter: "url(#glow)",
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileDrag={{ 
        scale: 1.1,
        filter: "url(#neon)",
        zIndex: 1000
      }}
      style={{ cursor: 'move' }}
    >
      {/* Jika element memiliki transform asli, kita bungkus lagi */}
      <g transform={element.transform || ''}>
        {renderElement()}
      </g>
    </motion.g>
  );
};

export default DraggableSvgItem;
