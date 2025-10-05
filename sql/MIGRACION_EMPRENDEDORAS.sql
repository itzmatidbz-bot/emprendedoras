-- =====================================================
-- 🌟 EMPRENDEDORAS DE ACERO - MIGRACIÓN SEGURA
-- Migración que preserva productos existentes
-- =====================================================

-- =====================================================
-- 📋 NUEVAS TABLAS DE CATEGORIZACIÓN
-- =====================================================

-- Tabla de categorías principales
CREATE TABLE IF NOT EXISTS categorias_nuevas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tipos de producto (subcategorías)
CREATE TABLE IF NOT EXISTS tipos_producto (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_nuevas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(categoria_id, nombre)
);

-- Tabla de materiales/telas
CREATE TABLE IF NOT EXISTS materiales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de colores
CREATE TABLE IF NOT EXISTS colores_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigo_hex VARCHAR(7),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 🛍️ EXTENSIÓN DE TABLA PRODUCTOS (SIN TOCAR EXISTENTES)
-- =====================================================

-- Agregar nuevas columnas a la tabla productos existente (solo si no existen)
DO $$ 
BEGIN
    -- Verificar y agregar columnas una por una
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='categoria_nueva_id') THEN
        ALTER TABLE productos ADD COLUMN categoria_nueva_id INTEGER REFERENCES categorias_nuevas(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='tipo_producto_id') THEN
        ALTER TABLE productos ADD COLUMN tipo_producto_id INTEGER REFERENCES tipos_producto(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='material_id') THEN
        ALTER TABLE productos ADD COLUMN material_id INTEGER REFERENCES materiales(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='tallas_disponibles') THEN
        ALTER TABLE productos ADD COLUMN tallas_disponibles TEXT[]; -- Array de tallas
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='colores_disponibles') THEN
        ALTER TABLE productos ADD COLUMN colores_disponibles TEXT[]; -- Array de colores
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='imagenes_urls') THEN
        ALTER TABLE productos ADD COLUMN imagenes_urls TEXT[]; -- Array de URLs de imágenes
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='tags') THEN
        ALTER TABLE productos ADD COLUMN tags TEXT[]; -- Tags para búsqueda
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='activo') THEN
        ALTER TABLE productos ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='destacado') THEN
        ALTER TABLE productos ADD COLUMN destacado BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='generar_con_ia') THEN
        ALTER TABLE productos ADD COLUMN generar_con_ia BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='updated_at') THEN
        ALTER TABLE productos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- =====================================================
-- 📊 DATOS INICIALES PARA EMPRENDEDORAS DE ACERO
-- =====================================================

-- Insertar categorías principales
INSERT INTO categorias_nuevas (nombre, descripcion) VALUES
('Prendas de Vestir', 'Ropa y vestimenta en general'),
('Accesorios', 'Complementos y accesorios'),
('Calzado', 'Zapatos y calzado'),
('Bolsos y Carteras', 'Bolsos, carteras y mochilas'),
('Joyería', 'Joyas y bijouterie'),
('Hogar', 'Artículos para el hogar'),
('Belleza', 'Productos de belleza y cuidado personal'),
('Artesanías', 'Productos artesanales únicos'),
('Temporada', 'Productos de temporada y especiales')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar tipos de producto
INSERT INTO tipos_producto (categoria_id, nombre, descripcion) VALUES
-- Prendas de Vestir (1)
(1, 'Blusas', 'Blusas casuales y elegantes'),
(1, 'Vestidos', 'Vestidos para toda ocasión'),
(1, 'Pantalones', 'Pantalones y jeans'),
(1, 'Faldas', 'Faldas de diferentes estilos'),
(1, 'Tops', 'Tops y camisetas'),
(1, 'Chaquetas', 'Chaquetas y abrigos'),
(1, 'Conjuntos', 'Sets coordinados'),
-- Accesorios (2)
(2, 'Collares', 'Collares y cadenas'),
(2, 'Pulseras', 'Pulseras y brazaletes'),
(2, 'Aretes', 'Aretes y pendientes'),
(2, 'Anillos', 'Anillos diversos'),
(2, 'Bufandas', 'Bufandas y pañuelos'),
(2, 'Cinturones', 'Cinturones de moda'),
-- Calzado (3)
(3, 'Zapatos', 'Zapatos formales'),
(3, 'Sandalias', 'Sandalias casuales'),
(3, 'Botas', 'Botas y botines'),
(3, 'Deportivos', 'Calzado deportivo'),
-- Bolsos y Carteras (4)
(4, 'Carteras', 'Carteras de mano'),
(4, 'Bolsos', 'Bolsos grandes'),
(4, 'Mochilas', 'Mochilas y backpacks'),
(4, 'Clutches', 'Bolsos pequeños de noche'),
-- Joyería (5)
(5, 'Joyas de Plata', 'Joyería en plata'),
(5, 'Joyas de Oro', 'Joyería en oro'),
(5, 'Bijouterie', 'Joyería de fantasía'),
-- Hogar (6)
(6, 'Decoración', 'Elementos decorativos'),
(6, 'Textiles', 'Textiles para el hogar'),
(6, 'Organizadores', 'Organizadores y almacenamiento'),
-- Belleza (7)
(7, 'Maquillaje', 'Productos de maquillaje'),
(7, 'Cuidado de la Piel', 'Productos para el cuidado'),
(7, 'Perfumes', 'Fragancias'),
-- Artesanías (8)
(8, 'Tejidos', 'Productos tejidos a mano'),
(8, 'Cerámica', 'Productos de cerámica'),
(8, 'Madera', 'Artesanías en madera'),
-- Temporada (9)
(9, 'Verano', 'Productos de verano'),
(9, 'Invierno', 'Productos de invierno'),
(9, 'Navidad', 'Productos navideños'),
(9, 'San Valentín', 'Productos para San Valentín')
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- Insertar materiales comunes
INSERT INTO materiales (nombre, descripcion) VALUES
('Algodón', 'Fibra natural suave y transpirable'),
('Poliéster', 'Fibra sintética duradera'),
('Lana', 'Fibra natural cálida'),
('Seda', 'Fibra natural elegante'),
('Denim', 'Tela resistente para jeans'),
('Lino', 'Fibra natural fresca'),
('Cuero', 'Material natural para accesorios'),
('Cuero Sintético', 'Alternativa vegana al cuero'),
('Lycra', 'Fibra elástica'),
('Viscosa', 'Fibra semi-sintética suave'),
('Chiffon', 'Tela ligera y translúcida'),
('Encaje', 'Tela decorativa calada'),
('Metal', 'Para joyería y accesorios'),
('Plata', 'Metal precioso'),
('Oro', 'Metal precioso'),
('Cerámica', 'Material para artesanías'),
('Madera', 'Material natural'),
('Cristal', 'Material transparente decorativo')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar colores básicos
INSERT INTO colores_productos (nombre, codigo_hex) VALUES
('Negro', '#000000'),
('Blanco', '#FFFFFF'),
('Gris', '#808080'),
('Azul', '#0066CC'),
('Azul Marino', '#000080'),
('Rojo', '#FF0000'),
('Rosa', '#FF69B4'),
('Verde', '#008000'),
('Amarillo', '#FFFF00'),
('Naranja', '#FFA500'),
('Morado', '#800080'),
('Beige', '#F5F5DC'),
('Marrón', '#8B4513'),
('Dorado', '#FFD700'),
('Plateado', '#C0C0C0'),
('Turquesa', '#40E0D0'),
('Coral', '#FF7F50'),
('Lavanda', '#E6E6FA'),
('Crema', '#FFFDD0'),
('Vino', '#722F37')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- 📊 VISTA COMPLETA DE PRODUCTOS
-- =====================================================

CREATE OR REPLACE VIEW vista_productos_completa AS
SELECT 
    p.*,
    cn.nombre as categoria_nueva_nombre,
    tp.nombre as tipo_producto_nombre,
    m.nombre as material_nombre,
    -- Convertir arrays a JSON para mejor manejo en frontend
    array_to_json(p.tallas_disponibles) as tallas_json,
    array_to_json(p.colores_disponibles) as colores_json,
    array_to_json(p.imagenes_urls) as imagenes_json,
    array_to_json(p.tags) as tags_json
FROM productos p
LEFT JOIN categorias_nuevas cn ON p.categoria_nueva_id = cn.id
LEFT JOIN tipos_producto tp ON p.tipo_producto_id = tp.id
LEFT JOIN materiales m ON p.material_id = m.id
WHERE p.activo = true OR p.activo IS NULL;

-- =====================================================
-- 🔄 TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Solo crear el trigger si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_productos_updated_at') THEN
        CREATE TRIGGER update_productos_updated_at 
        BEFORE UPDATE ON productos 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 📝 MIGRAR PRODUCTOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Actualizar productos existentes para que tengan una categoría por defecto
UPDATE productos 
SET categoria_nueva_id = 1, activo = true 
WHERE categoria_nueva_id IS NULL;

-- Si tienes una columna 'categoria' antigua, puedes mapearla así:
-- UPDATE productos p
-- SET categoria_nueva_id = cn.id
-- FROM categorias_nuevas cn
-- WHERE p.categoria = cn.nombre AND p.categoria_nueva_id IS NULL;

-- =====================================================
-- ✅ CONFIRMACIÓN
-- =====================================================

SELECT 
    'Migración completada exitosamente! 🎉' as mensaje,
    'Productos existentes preservados ✅' as estado,
    count(*) as productos_totales
FROM productos;

-- Mostrar estadísticas
SELECT 
    'Categorías creadas:' as tipo,
    count(*) as cantidad
FROM categorias_nuevas
UNION ALL
SELECT 
    'Tipos de producto creados:' as tipo,
    count(*) as cantidad
FROM tipos_producto
UNION ALL
SELECT 
    'Materiales creados:' as tipo,
    count(*) as cantidad
FROM materiales
UNION ALL
SELECT 
    'Colores creados:' as tipo,
    count(*) as cantidad
FROM colores_productos;