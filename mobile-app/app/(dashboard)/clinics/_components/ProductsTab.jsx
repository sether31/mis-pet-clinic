import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Pressable, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 

import AppText from '../../../../components/AppText';
import AnimatedWrapper from '../../../../components/AnimatedWrapper';
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../../assets/images/no-image.jpg');

const ProductCard = ({ item, index, branchId }) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const imageSource = getMediaUrl(item.prod_pic) ? { uri: getMediaUrl(item.prod_pic) } : NO_IMAGE;
  const isOutOfStock = parseInt(item.total_stock) <= 0;

  const handlePressIn = () => {
    if (isOutOfStock) return;

    Animated.timing(scaleAnim, {
      toValue: 1.1, 
      duration: 300, 
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1, 
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedWrapper index={index} style={styles.cardWrapper}>
      <Pressable 
        style={({ pressed }) => [styles.card, isOutOfStock && styles.cardOutOfStock, pressed && !isOutOfStock && { borderColor: Colors.primary }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          if (!isOutOfStock) {
            router.push(`/clinics/product/${item.product_id}?branch_id=${branchId}`);
          }
        }} 
      >
        {({ pressed }) => {
          const isActive = pressed && !isOutOfStock;

          return (
            <>
              <View style={styles.imageContainer}>
                <Animated.Image 
                  source={imageSource} 
                  style={[styles.productImage, { transform: [{ scale: scaleAnim }] }]} 
                />
                {isOutOfStock && (
                  <View style={styles.outOfStockOverlay}>
                    <AppText style={styles.outOfStockText}>SOLD OUT</AppText>
                  </View>
                )}
              </View>

              <View style={styles.infoContainer}>
                <AppText style={styles.categoryText}>{item.category}</AppText>
                
                <AppText style={[styles.productName, isActive]} numberOfLines={2}>
                  {item.name}
                </AppText>
                
                <View style={styles.bottomRow}>
                  <AppText style={styles.priceText}>₱{parseFloat(item.price).toFixed(2)}</AppText>
                  
                  <View style={[styles.smallReserveBtn, isOutOfStock ? styles.btnDisabled : isActive && { backgroundColor: Colors.primary }]}>
                    <Ionicons name="chevron-forward" size={16} color={isOutOfStock ? '#9CA3AF' : '#FFF'} />
                  </View>
                </View>
              </View>
            </>
          );
        }}
      </Pressable>
    </AnimatedWrapper>
  );
};

// Helper function needed inside the card
const getMediaUrl = (path) => {
  if (!path || path.trim() === '') return null;
  if (path.startsWith('http')) return path; 
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}/${cleanPath}`;
};


export default function ProductsTab({ branchId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (branchId) {
      fetchProducts();
    }
  }, [branchId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/shop/get-clinic-products.php?branch_id=${branchId}`);
      if (res?.success) {
        setProducts(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const uniqueCats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {categories.length > 1 && (
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <AppText style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
                  {cat}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.gridContainer}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-remove-outline" size={40} color="#9CA3AF" />
            <AppText style={styles.emptyTitle}>No Products Found</AppText>
            <AppText style={styles.emptySubtitle}>This clinic has not listed any services yet.</AppText>
          </View>
        ) : (
          filteredProducts.map((item, index) => (
            <ProductCard key={item.product_id.toString()} item={item} index={index} branchId={branchId} />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginHorizontal: 20, marginTop: 10, paddingHorizontal: 16, height: 48, borderRadius: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827' },
  categoriesWrapper: { marginTop: 16, marginBottom: 4 },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  categoryPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  categoryPillTextActive: { color: '#FFFFFF' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 20, paddingBottom: 40 },
  
  // Card Styles
  cardWrapper: { width: '48%', marginBottom: 16 }, 
  card: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border300 || '#E5E7EB' },
  cardOutOfStock: { opacity: 0.6, backgroundColor: '#F9FAFB' },
  
  imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6', position: 'relative', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  outOfStockText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  
  infoContainer: { padding: 12 },
  categoryText: { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20, height: 40 }, 
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  priceText: { fontSize: 16, fontWeight: '900', color: '#111827' },
  
  smallReserveBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#E5E7EB' },
  
  emptyContainer: { width: '100%', alignItems: 'center', marginTop: 40, padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});