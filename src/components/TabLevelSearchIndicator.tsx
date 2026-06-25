import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { appColors, typography } from '../global'
import { scaleWidth } from '../global/dimensions';
import { useAppSelector } from '../store';
import { currentSearchSelector } from '../slices';

const TabLevelSearchIndicator = () => {
  const {address,percent, searchId} = useAppSelector(currentSearchSelector);
  if(!searchId) return
  return (
    <View style={{paddingHorizontal: scaleWidth(25), alignItems:'center'}}>

    <View style={{position:'absolute', bottom: 90 + 20, 
        backgroundColor: appColors.maroon,
        borderRadius: scaleWidth(10),
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleWidth(10),
        flexDirection:"row",
        justifyContent:'space-between',
        width: "100%"
    }}>
        <View>
      <Text style={[typography(600, 12, 'white'), {marginBottom: 5}]}>Search In Progress:</Text>
      <Text style={typography(700, 14, 'white')}>{address}</Text>
        </View>
        <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
            <Text style={typography(700, 16, 'white')}>{percent}%</Text>
        <ActivityIndicator/>

        </View>
    </View>
    </View>
  )
}

export default TabLevelSearchIndicator

const styles = StyleSheet.create({})