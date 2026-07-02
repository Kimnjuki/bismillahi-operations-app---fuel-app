import React, { useRef, useCallback, useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeableTabViewProps {
  /** Ordered list of tab screen components to render */
  screens: React.ReactNode[];
  /** Currently active tab index */
  activeIndex: number;
  /** Called when the user swipes to a new tab */
  onIndexChange: (index: number) => void;
  /** Allow edge-to-edge swiping (defaults to true) */
  swipeEnabled?: boolean;
}

/**
 * A horizontal swipeable pager that lets users swipe between tabs.
 * Renders all screens in a horizontal ScrollView with snap behavior.
 * Syncs with the active tab index so tab bar presses still work.
 */
export default function SwipeableTabView({
  screens,
  activeIndex,
  onIndexChange,
  swipeEnabled = true,
}: SwipeableTabViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const currentIndexRef = useRef(activeIndex);
  const isScrolling = useRef(false);
  const containerWidthRef = useRef(SCREEN_WIDTH);

  // When activeIndex changes externally (tab bar press), scroll to that page
  useEffect(() => {
    if (currentIndexRef.current !== activeIndex) {
      currentIndexRef.current = activeIndex;
      scrollViewRef.current?.scrollTo({
        x: activeIndex * containerWidthRef.current,
        animated: true,
      });
    }
  }, [activeIndex]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidthRef.current) {
      containerWidthRef.current = width;
      // Re-sync scroll position after layout change
      scrollViewRef.current?.scrollTo({
        x: activeIndex * width,
        animated: false,
      });
    }
  }, [activeIndex]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const contentOffsetX = e.nativeEvent.contentOffset.x;
      const width = containerWidthRef.current;
      const newIndex = Math.round(contentOffsetX / width);

      if (newIndex !== currentIndexRef.current) {
        currentIndexRef.current = newIndex;
        onIndexChange(newIndex);
      }
    },
    [onIndexChange]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // If user stopped dragging but momentum hasn't started, detect index
      if (!e.nativeEvent?.velocity?.x) {
        const contentOffsetX = e.nativeEvent.contentOffset.x;
        const width = containerWidthRef.current;
        const newIndex = Math.round(contentOffsetX / width);
        if (newIndex !== currentIndexRef.current) {
          currentIndexRef.current = newIndex;
          onIndexChange(newIndex);
        }
      }
    },
    [onIndexChange]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={swipeEnabled}
        keyboardShouldPersistTaps="always"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEndDrag}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={containerWidthRef.current}
        snapToAlignment="start"
      >
        {screens.map((screen, index) => (
          <View
            key={`tab-screen-${index}`}
            style={[styles.screenContainer, { width: containerWidthRef.current }]}
          >
            {screen}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.app,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});