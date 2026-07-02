import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, StatusBar, Alert, Platform, SafeAreaView, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { EXPENSE_CATEGORIES, getCategoryIcon, getCategoryColor, type ExpenseCategory } from '../constants/expenseCategories';
import { generateUUID } from '../utils/uuid';
import { numberToWordsCDF } from '../utils/numberToWords';
import { formatCheckAmount } from '../utils/formatAmount';
import { internalAccountService } from '../services/internalAccountService';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { InternalAccount } from '../types';

const CHECK = {
  background:'#131313', surfaceContainer:'#201f1f', surfaceContainerHigh:'#2a2a2a',
  onSurface:'#e5e2e1', onSurfaceVariant:'#d4c5ab', primaryContainer:'#ffbf00',
  onPrimary:'#402d00', outline:'#9c8f78', outlineVariant:'#504532',
  error:'#ffb4ab', errorContainer:'#93000a', border:'#2a2a2a',
  activeBorder:'#ffbf00', divider:'#2a2a2a', checkPreviewBg:'#1c1b1b',
  checkPreviewTop:'#ffbf00', amber:'#ffbf00', textMuted:'#9c8f78',
};
const CURRENT_BALANCE=1500000;
const R={sm:2,default:4,md:6,lg:8,xl:12};
const MONTHS_ABBR=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const FONT = {
  labelCaps:{fontSize:12,fontWeight:'700',lineHeight:16,letterSpacing:.5,textTransform:'uppercase',fontFamily:Typography.fontFamily.semibold},
  monoLabel:{fontSize:12,fontWeight:'700',letterSpacing:.5,textTransform:'uppercase',fontFamily:Typography.fontFamily.mono},
  monoBase:{fontSize:14,fontWeight:'600',fontFamily:Typography.fontFamily.mono},
  monoInput:{fontSize:16,fontFamily:Typography.fontFamily.mono},
  statValue:{fontSize:24,fontWeight:'600',lineHeight:32,fontFamily:Typography.fontFamily.mono},
  bodyMd:{fontSize:14,lineHeight:20,fontFamily:Typography.fontFamily.body},
  bodyLg:{fontSize:16,lineHeight:24,fontFamily:Typography.fontFamily.body},
  interInput:{fontSize:14,fontFamily:Typography.fontFamily.body,color:CHECK.onSurface},
};

type ExpenseLine={id:string;category:string;amount:number;memo:string;}

export default function ExpenseEntryScreen(){
  const navigation=useNavigation();
  const{appUser}=useAuth();
  const[amount,setAmount]=useState('');
  const[expenseLines,setExpenseLines]=useState<ExpenseLine[]>([]);
  const[memoLong,setMemoLong]=useState('');
  const[charCount,setCharCount]=useState(0);
  const[isSubmitting,setIsSubmitting]=useState(false);
  const[errors,setErrors]=useState<Record<string,string>>({});
  const[lineErrors,setLineErrors]=useState<Record<string,{category?:string;amount?:string;memo?:string}>>({});
  const[showClearConfirm,setShowClearConfirm]=useState(false);
  const[focusedField,setFocusedField]=useState<string|null>(null);
  const[checkSequence,setCheckSequence]=useState(0);
  const[selectedPayFromAccount,setSelectedPayFromAccount]=useState<string>('');
  const[allAccounts,setAllAccounts]=useState<InternalAccount[]>([]);
  const[showAccountPicker,setShowAccountPicker]=useState(false);
  const[payTo,setPayTo]=useState('');
  const[refNo,setRefNo]=useState('CHQ-0041');
  const[selectedDate,setSelectedDate]=useState<Date>(new Date());
  const[showCalendar,setShowCalendar]=useState(false);
  const[calendarMonth,setCalendarMonth]=useState<number>(new Date().getMonth()+1);
  const[calendarYear,setCalendarYear]=useState<number>(new Date().getFullYear());
  const[exRate,setExRate]=useState('2800');
  const[showCategoryPicker,setShowCategoryPicker]=useState<string|null>(null);
  const[categorySearchQuery,setCategorySearchQuery]=useState('');

  const numericAmount=useMemo(()=>parseFloat(amount)||0,[amount]);
  const linesTotal=useMemo(()=>expenseLines.reduce((s,l)=>s+(Number(l.amount)||0),0),[expenseLines]);
  const usdEquiv=useMemo(()=>{const a=parseFloat(amount)||0;const r=parseFloat(exRate)||1;return r<=0?'0.00':(a/r).toFixed(2);},[amount,exRate]);
  const amountInWords=useMemo(()=>numberToWordsCDF(numericAmount),[numericAmount]);
  const formattedAmount=useMemo(()=>numericAmount>0?formatCheckAmount(numericAmount):'',[numericAmount]);
  const balanceAfter=useMemo(()=>Math.max(0,CURRENT_BALANCE-numericAmount),[numericAmount]);
  const checkRef=useMemo(()=>{const b=(Date.now()%10000)+checkSequence;return 'CHQ-'+String(b).padStart(4,'0');},[checkSequence]);
  const checkDate=useMemo(()=>{const d=selectedDate;return `${MONTHS_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;},[selectedDate]);
  const filteredCategories=useMemo(()=>{
    if(!categorySearchQuery.trim())return[...EXPENSE_CATEGORIES];
    const q=categorySearchQuery.toLowerCase().trim();
    return EXPENSE_CATEGORIES.filter(cat=>cat.toLowerCase().includes(q));
  },[categorySearchQuery]);

  const focusBorder=useCallback((f:string)=>focusedField===f?{borderColor:CHECK.activeBorder}:{borderColor:CHECK.border},[focusedField]);
  useEffect(()=>{
    const fetchAccounts=async()=>{
      const result=await internalAccountService.getInternalAccounts();
      if(result.success&&result.data)setAllAccounts(result.data);
    };
    fetchAccounts();
  },[]);
  const validate=useCallback(()=>{
    const ne:Record<string,string>={};const nle:Record<string,{category?:string;amount?:string;memo?:string}>={};
    if(!selectedPayFromAccount)ne.payFromAccount='Select a pay from account';
    if(!amount||isNaN(numericAmount)||numericAmount<=0)ne.amount='Enter a valid amount';
    expenseLines.forEach(l=>{const e:{category?:string;amount?:string;memo?:string}={};
      if(!l.category)e.category='Select a category';
      if(!l.amount||l.amount<=0)e.amount='Required';
      if(!l.memo.trim())e.memo='Add a memo';
      if(e.category||e.amount||e.memo)nle[l.id]=e;
    });
    if(Object.keys(nle).length>0)ne.expenseLines='Complete or remove empty expense lines';
    setErrors(ne);setLineErrors(nle);return Object.keys(ne).length===0;
  },[amount,numericAmount,expenseLines,selectedPayFromAccount]);

  const handleSave=useCallback(async(mode:'close'|'new')=>{
    if(!validate())return;setIsSubmitting(true);setCheckSequence(s=>s+1);
    try{
      const account = allAccounts.find(a => a.account_name === selectedPayFromAccount);
      const expensePayload = {
        category: expenseLines[0]?.category || 'General',
        amount: numericAmount,
        description: memoLong || payTo,
        payment_method: 'cash' as any,
        expense_date: selectedDate.toISOString().split('T')[0],
        account_id: account?.id,
        created_by: appUser?.id || '',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expensePayload]);

      if (account && !error) {
        const newBalance = account.balance - numericAmount;
        await supabase
          .from('internal_accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }

      if (error) throw error;

      if(mode==='close'){navigation.goBack();}
      else{setAmount('');setExpenseLines([]);setMemoLong('');setCharCount(0);setErrors({});setLineErrors({});setSelectedPayFromAccount('');setPayTo('');setRefNo('CHQ-0041');setSelectedDate(new Date());setExRate('2800');setShowCategoryPicker(null);setCategorySearchQuery('');Alert.alert('Saved','Expense recorded.');}
    }catch(e){Alert.alert('Error','Failed to save expense');}finally{setIsSubmitting(false);}
  },[validate,numericAmount,memoLong,expenseLines,selectedPayFromAccount,allAccounts,appUser?.id,navigation,payTo]);

  const handleClear=useCallback(()=>{
    setAmount('');setExpenseLines([]);setMemoLong('');setCharCount(0);setErrors({});setLineErrors({});setShowClearConfirm(false);setSelectedPayFromAccount('');setPayTo('');setRefNo('CHQ-0041');setSelectedDate(new Date());setExRate('2800');setShowCategoryPicker(null);setCategorySearchQuery('');
  },[]);
  const addExpenseLine=useCallback(()=>setExpenseLines(p=>[...p,{id:generateUUID(),category:'',amount:0,memo:''}]),[]);
  const updateExpenseLine=useCallback((id:string,f:'category'|'amount'|'memo',v:string|number)=>setExpenseLines(p=>p.map(l=>l.id===id?{...l,[f]:v}:l)),[]);
  const removeExpenseLine=useCallback((id:string)=>setExpenseLines(p=>p.filter(l=>l.id!==id)),[]);

  const renderExpenseLine=({ item, index }:{item:ExpenseLine;index:number})=>{
    const lineErr=lineErrors[item.id];
    return (
      <View style={styles.expenseLineWrap}>
        <View style={[styles.expenseLineRow,lineErr&&styles.expenseLineRowError]}>
          <View style={styles.categorySelector}>
            <TouchableOpacity style={styles.categoryButton} onPress={()=>{setShowCategoryPicker(item.id);setCategorySearchQuery('');}}>
              <MaterialCommunityIcons name={getCategoryIcon(item.category) as any} size={18} color={CHECK.primaryContainer} />
              <Text style={item.category?styles.categoryText:styles.categoryTextPlaceholder}>{item.category||'Select expense category'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={CHECK.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={styles.amountInputWrap}>
            <TextInput style={[styles.lineAmountInput,lineErr?.amount&&styles.inputError]} placeholder="0" placeholderTextColor={CHECK.outlineVariant} value={item.amount>0?String(item.amount):''} keyboardType="numeric" onChangeText={text=>updateExpenseLine(item.id,'amount',parseFloat(text)||0)} onFocus={()=>setFocusedField('lineAmount-'+item.id)} onBlur={()=>setFocusedField(null)} />
          </View>
          <View style={styles.memoInputWrap}>
            <TextInput style={styles.lineMemoInput} placeholder="Memo" placeholderTextColor={CHECK.outlineVariant} value={item.memo} onChangeText={text=>updateExpenseLine(item.id,'memo',text)} onFocus={()=>setFocusedField('lineMemo-'+item.id)} onBlur={()=>setFocusedField(null)} />
          </View>
          <TouchableOpacity style={styles.lineDeleteBtn} onPress={()=>removeExpenseLine(item.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <MaterialCommunityIcons name="close" size={18} color={CHECK.errorContainer} />
          </TouchableOpacity>
        </View>
        {lineErr&&<View style={styles.lineErrorWrap}>
          {lineErr.category&&<Text style={styles.lineErrorText}>{lineErr.category}</Text>}
          {lineErr.amount&&<Text style={styles.lineErrorText}>{lineErr.amount}</Text>}
          {lineErr.memo&&<Text style={styles.lineErrorText}>{lineErr.memo}</Text>}
        </View>}
      </View>
    );
  };

  const renderCalendar=()=>{
    const daysInMonth=new Date(calendarYear,calendarMonth-1,1).getDate();
    return Array.from({length:daysInMonth},(_,i)=>({day:i+1,empty:false}));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={CHECK.background} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:200}}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.navBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={CHECK.onSurface} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Write Check</Text>
          <TouchableOpacity style={styles.navBtn} hitSlop={{top:8,bottom:8,left:8,right:8}} accessibilityLabel="More options">
            <MaterialCommunityIcons name="dots-vertical" size={24} color={CHECK.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Pay From Account */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionLabel}>PAY FROM ACCOUNT</Text>
          <TouchableOpacity style={[styles.accountButton,(errors.payFromAccount)&&styles.inputError]} onPress={()=>setShowAccountPicker(true)}>
            <View style={styles.accountButtonLeft}>
              <MaterialCommunityIcons name="bank" size={20} color={CHECK.onSurface} />
              <Text style={styles.accountButtonLabel}>{selectedPayFromAccount||'Select account...'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={18} color={CHECK.onSurface} />
          </TouchableOpacity>
          {selectedPayFromAccount && (()=>{
            const acc=allAccounts.find(a=>a.account_name===selectedPayFromAccount);
            return acc?<View style={styles.accountBadgeRow}>
              <Text style={styles.accountBalanceText}>Available balance: {acc.balance.toLocaleString('en-US')} {acc.currency}</Text>
              <View style={styles.accountBadge}><Text style={styles.accountBadgeText}>{acc.currency} ACCOUNT</Text></View>
            </View>:null;
          })()}
          {errors.payFromAccount && <Text style={[styles.errorText,{marginTop:4}]}>{errors.payFromAccount}</Text>}
        </View>

        {/* Payee & Ref/Date */}
        <View style={styles.payeeSection}>
          <View style={styles.payeeInputWrap}>
            <Text style={styles.sectionLabel}>PAY TO</Text>
            <View style={styles.payeeInputRow}>
              <TextInput style={[styles.payeeInput,focusBorder('payTo')]} placeholder="Search supplier or creditor..." placeholderTextColor={CHECK.outlineVariant} value={payTo} onChangeText={setPayTo} onFocus={()=>setFocusedField('payTo')} onBlur={()=>setFocusedField(null)} />
              <MaterialCommunityIcons name="magnify" size={20} color={CHECK.onSurfaceVariant} style={styles.payeeSearchIcon} />
            </View>
          </View>
          <View style={styles.refDateRow}>
            <View style={{flex:1,marginRight:Spacing.sm}}>
              <Text style={styles.sectionLabel}>REF NO.</Text>
              <TextInput style={[styles.refInput,focusBorder('refNo')]} value={refNo} onChangeText={setRefNo} onFocus={()=>setFocusedField('refNo')} onBlur={()=>setFocusedField(null)} />
            </View>
            <View style={{flex:1,marginLeft:Spacing.sm}}>
              <Text style={styles.sectionLabel}>DATE</Text>
              <TouchableOpacity style={[styles.dateButton,focusBorder('dateBtn')]} onPress={()=>setShowCalendar(true)} accessibilityRole="button" accessibilityLabel="Select date">
                <Text style={styles.dateButtonText}>{checkDate}</Text>
                <MaterialCommunityIcons name="calendar-month" size={18} color={CHECK.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Amount + Rate */}
        <View style={styles.amountBlock}>
          <Text style={styles.sectionLabel}>AMOUNT</Text>
          <View style={styles.amountBoxRow}>
            <View style={styles.amountPrefixBox}>
              <Text style={styles.amountPrefixText}>CDF</Text>
              <View style={styles.amountPrefixDivider} />
            </View>
            <TextInput style={[styles.amountInput,focusBorder('amount'),errors.amount&&styles.inputError]} placeholder="0" placeholderTextColor={CHECK.outlineVariant} value={amount} onChangeText={setAmount} keyboardType="numeric" onFocus={()=>setFocusedField('amount')} onBlur={()=>setFocusedField(null)} />
          </View>
          {amountInWords ? <Text style={styles.amountWordsText}>{amountInWords} CDF</Text> : null}
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          <View style={styles.rateSection}>
            <View style={styles.rateInputRow}>
              <Text style={styles.rateLabel}>MANUAL RATE:</Text>
              <View style={styles.rateInputBox}>
                <TextInput style={styles.rateFieldInput} value={exRate} onChangeText={setExRate} keyboardType="numeric" accessibilityLabel="Exchange rate" />
                <Text style={styles.rateSuffix}>CDF/USD</Text>
              </View>
            </View>
            <View style={styles.usdPreviewBox}>
              <Text style={styles.usdPreviewLabel}>≈</Text>
              <Text style={styles.usdPreviewValue}>{usdEquiv}</Text>
              <Text style={styles.usdPreviewUnit}>USD</Text>
            </View>
          </View>
        </View>

        {/* Expense Lines */}
        <View style={styles.enhancedExpenseSection}>
          <View style={styles.enhancedExpenseHeader}>
            <View>
              <Text style={styles.sectionLabel}>EXPENSE CATEGORIES</Text>
              <Text style={styles.enhancedExpenseHint}>Add categories with amount and memo.</Text>
            </View>
            <View style={styles.linesTotalBadge}>
              <Text style={styles.linesTotalText}>{linesTotal.toLocaleString('en-US')}</Text>
            </View>
          </View>
          <FlatList data={expenseLines} renderItem={renderExpenseLine} keyExtractor={(item)=>item.id} scrollEnabled={false} ListEmptyComponent={<Text style={styles.linesEmptyText}>No expense categories added</Text>} />
          <TouchableOpacity style={styles.addLineButton} onPress={addExpenseLine} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <MaterialCommunityIcons name="plus" size={16} color={CHECK.onSurfaceVariant} />
            <Text style={styles.addLineButtonText}>ADD EXPENSE CATEGORY</Text>
          </TouchableOpacity>
          {errors.expenseLines && <Text style={styles.errorText}>{errors.expenseLines}</Text>}
        </View>

        {/* Payment Method - Cash Only */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.cashOnlyBadge}>
            <MaterialCommunityIcons name="cash" size={18} color={CHECK.onPrimary} />
            <Text style={styles.cashOnlyText}>CASH</Text>
          </View>
        </View>

        {/* Memo */}
        <View style={styles.memoSection}>
          <Text style={styles.sectionLabel}>MEMO</Text>
          <TextInput style={[styles.memoTextarea,focusBorder('memoLong')]} placeholder="Additional details..." placeholderTextColor={CHECK.outlineVariant} value={memoLong} onChangeText={(text)=>{if(text.length<=500){setMemoLong(text);setCharCount(text.length);}}} multiline maxLength={500} onFocus={()=>setFocusedField('memoLong')} onBlur={()=>setFocusedField(null)} accessibilityLabel="Additional details" />
          <Text style={[styles.charCounter,charCount>450&&styles.charCounterWarning]}>{charCount} / 500</Text>
        </View>

        {/* Check Preview */}
        <View style={styles.checkPreviewCard} accessible accessibilityLabel="Check preview">
          <View style={styles.checkHeaderRow}>
            <View>
              <Text style={styles.checkStationRef}>STATION 104 - LEDGER</Text>
              <Text style={styles.checkRefText}>REF: {checkRef}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={styles.checkFieldLabel}>DATE</Text>
              <Text style={styles.checkFieldValue}>{checkDate}</Text>
            </View>
          </View>
          <View style={styles.checkDivider} />
          <View style={[styles.checkRow,{marginTop:8}]}>
            <Text style={styles.checkFieldLabel}>PAY TO THE ORDER OF:</Text>
            <Text style={styles.checkValue}>{payTo||'ENGIE SUPPLIES LTD'}</Text>
          </View>
          <View style={[styles.checkRow,{marginTop:8}]}>
            <Text style={styles.checkFieldLabel}>THE SUM OF:</Text>
            <Text style={styles.checkValueItalic}>{amountInWords||'ZERO CDF'}</Text>
          </View>
          <View style={styles.checkDivider} />
          <View style={styles.checkBottomRow}>
            <View>
              <Text style={styles.checkFieldLabel}>BALANCE AFTER:</Text>
              <Text style={styles.checkBalanceValue}>{balanceAfter.toLocaleString('en-US')} CDF</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.checkFieldLabel}>AMOUNT</Text>
              <Text style={styles.amountBoxValue}>{formattedAmount||'***0.00'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.saveCloseButton,isSubmitting&&styles.buttonDisabled]} onPress={()=>handleSave('close')} disabled={isSubmitting} activeOpacity={0.98} hitSlop={{top:4,bottom:4,left:4,right:4}}>
          <MaterialCommunityIcons name="content-save" size={20} color={CHECK.onPrimary} />
          <Text style={styles.saveCloseText}>{isSubmitting?'SAVING...':'SAVE & CLOSE'}</Text>
        </TouchableOpacity>
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity style={[styles.secondaryButton,styles.saveNewButtonBase]} onPress={()=>handleSave('new')} disabled={isSubmitting} activeOpacity={0.7} hitSlop={{top:4,bottom:4,left:4,right:4}}>
            <Text style={styles.saveNewText}>SAVE & NEW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton,styles.clearButtonBase]} onPress={()=>setShowClearConfirm(true)} disabled={isSubmitting} activeOpacity={0.7} hitSlop={{top:4,bottom:4,left:4,right:4}}>
            <Text style={styles.clearText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clear Confirmation */}
      <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={()=>setShowClearConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Confirm Clear</Text>
            <Text style={styles.confirmMessage}>Clear all fields? This cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelButton} onPress={()=>setShowClearConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmClearButton} onPress={handleClear}>
                <Text style={styles.confirmClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Date Picker Modal */}
      {showCalendar&&(
        <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={()=>setShowCalendar(false)}>
          <TouchableWithoutFeedback onPress={()=>setShowCalendar(false)}>
            <View style={styles.calendarOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={()=>setCalendarMonth(m=>(m===1?12:m-1))} style={styles.calendarNavBtn}><MaterialCommunityIcons name="chevron-left" size={22} color={CHECK.onSurface} /></TouchableOpacity>
                    <Text style={styles.calendarTitle}>{calendarMonth} / {calendarYear}</Text>
                    <TouchableOpacity onPress={()=>setCalendarMonth(m=>(m===12?1:m+1))} style={styles.calendarNavBtn}><MaterialCommunityIcons name="chevron-right" size={22} color={CHECK.onSurface} /></TouchableOpacity>
                  </View>
                  <View style={styles.calendarWeekRow}>
                    {['S','M','T','W','T','F','S'].map((d,i)=><Text key={i} style={styles.calendarWeekText}>{d}</Text>)}
                  </View>
                  <View style={styles.calendarGrid}>
                    {(()=>{
                      const firstDay=new Date(calendarYear,calendarMonth-1,1).getDay();
                      const days=new Date(calendarYear,calendarMonth,0).getDate();
                      const today=new Date();
                      const cells=[];
                      for(let i=0;i<firstDay;i++)cells.push(<View key={'e'+i} style={styles.calendarCellEmpty} />);
                      for(let d=1;d<=days;d++){
                        const selected=selectedDate&&selectedDate.getFullYear()===calendarYear&&selectedDate.getMonth()+1===calendarMonth&&selectedDate.getDate()===d;
                        const isToday=today.getFullYear()===calendarYear&&today.getMonth()+1===calendarMonth&&today.getDate()===d;
                        cells.push(<TouchableOpacity key={'d'+d} style={[styles.calendarCell,selected&&styles.calendarCellSelected,isToday&&styles.calendarCellToday]} onPress={()=>{setSelectedDate(new Date(calendarYear,calendarMonth-1,d));setShowCalendar(false);}}><Text style={[styles.calendarCellText,selected&&styles.calendarCellTextSelected,isToday&&styles.calendarCellTextToday]}>{d}</Text></TouchableOpacity>);
                      }
                      return cells;
                    })()}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
      {/* Account Picker Modal */}
      {showAccountPicker&&(
        <Modal visible={showAccountPicker} transparent animationType="slide" onRequestClose={()=>setShowAccountPicker(false)}>
          <TouchableWithoutFeedback onPress={()=>setShowAccountPicker(false)}>
            <View style={styles.calendarOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarTitle}>SELECT ACCOUNT</Text>
                  </View>
                  <FlatList
                    data={allAccounts}
                    keyExtractor={(item)=>item.id}
                    renderItem={({item})=>(
                      <TouchableOpacity style={styles.accountPickerItem} onPress={()=>{setSelectedPayFromAccount(item.account_name);setShowAccountPicker(false);}}>
                        <View style={styles.accountPickerLeft}>
                          <MaterialCommunityIcons name="bank" size={20} color={CHECK.onSurface} />
                          <View>
                            <Text style={styles.accountPickerName}>{item.account_name}</Text>
                            <Text style={styles.accountPickerMeta}>{item.station_name} · {item.account_type}</Text>
                          </View>
                        </View>
                        <View style={styles.accountPickerRight}>
                          <Text style={styles.accountPickerBalance}>{item.balance.toLocaleString('en-US')} {item.currency}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.linesEmptyText}>No accounts available</Text>}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
      {/* Category Picker Modal */}
      {showCategoryPicker&&(
        <Modal visible={!!showCategoryPicker} transparent animationType="fade" onRequestClose={()=>setShowCategoryPicker(null)}>
          <TouchableWithoutFeedback onPress={()=>setShowCategoryPicker(null)}>
            <View style={styles.calendarOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarTitle}>SELECT CATEGORY</Text>
                    <TouchableOpacity onPress={()=>setShowCategoryPicker(null)}>
                      <MaterialCommunityIcons name="close" size={22} color={CHECK.onSurface} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.categorySearchRow}>
                    <MaterialCommunityIcons name="magnify" size={18} color={CHECK.onSurfaceVariant} style={styles.categorySearchIcon} />
                    <TextInput
                      style={styles.categorySearchInput}
                      placeholder="Type to search categories..."
                      placeholderTextColor={CHECK.outlineVariant}
                      value={categorySearchQuery}
                      onChangeText={setCategorySearchQuery}
                      autoFocus
                    />
                  </View>
                  <FlatList
                    data={filteredCategories}
                    keyExtractor={(item)=>item}
                    renderItem={({item:cat})=>(
                      <TouchableOpacity
                        style={styles.categoryPickerItem}
                        onPress={()=>{
                          updateExpenseLine(showCategoryPicker,'category',cat);
                          setShowCategoryPicker(null);
                          setCategorySearchQuery('');
                        }}
                      >
                        <View style={styles.categoryPickerLeft}>
                           <MaterialCommunityIcons name={getCategoryIcon(cat) as any} size={20} color={CHECK.primaryContainer} />
                          <Text style={styles.categoryPickerText}>{cat}</Text>
                        </View>
                        {expenseLines.find(l=>l.id===showCategoryPicker)?.category===cat&&(
                          <MaterialCommunityIcons name="check" size={20} color={CHECK.primaryContainer} />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.linesEmptyText}>No matching categories</Text>}
                    style={styles.categoryList}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles: Record<string, any> = {
  container: { flex:1, backgroundColor:CHECK.background, maxWidth:480, alignSelf:'center', width:'100%' },
  scrollView: { flex:1 },
  navBar: { height:56, backgroundColor:CHECK.background, borderBottomWidth:1, borderBottomColor:CHECK.border, paddingHorizontal:Spacing.base, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  navBtn: { width:48, height:48, alignItems:'center', justifyContent:'center' },
  navTitle: { fontSize:20, fontWeight:'600', fontFamily:Typography.fontFamily.display, color:CHECK.amber, letterSpacing:-0.5 },
  accountSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  sectionLabel: { ...FONT.labelCaps, color:CHECK.textMuted, marginBottom:Spacing.sm },
  accountButton: { width:'100%', flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm, minHeight:48 },
  accountButtonLeft: { flexDirection:'row', alignItems:'center', gap:Spacing.sm },
  accountButtonLabel: { ...FONT.interInput, fontSize:15, color:CHECK.onSurface },
  accountBadgeRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:Spacing.sm },
  accountBalanceText: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant, fontStyle:'italic' },
  accountBadge: { backgroundColor:CHECK.primaryContainer, borderWidth:1, borderColor:CHECK.primaryContainer, borderRadius:R.sm, paddingHorizontal:Spacing.sm, paddingVertical:2 },
  accountBadgeText: { ...FONT.monoLabel, color:CHECK.onPrimary, fontSize:10 },
  payeeSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  payeeInputWrap: { marginBottom:Spacing.sm },
  payeeInputRow: { flexDirection:'row', alignItems:'center', backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, height:48, paddingHorizontal:Spacing.md },
  payeeInput: { flex:1, height:48, ...FONT.interInput },
  payeeSearchIcon: { marginLeft:Spacing.sm },
  refDateRow: { flexDirection:'row', gap:Spacing.sm },
  refInput: { backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, height:48, paddingHorizontal:Spacing.md, ...FONT.monoInput, fontSize:14, fontFamily:Typography.fontFamily.mono },
  dateButton: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, height:48, paddingHorizontal:Spacing.md },
  dateButtonText: { ...FONT.interInput, fontSize:14 },
  amountBlock: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  amountBoxRow: { flexDirection:'row', alignItems:'center', height:56, borderRadius:R.default, overflow:'hidden', borderWidth:1, borderColor:CHECK.border },
  amountPrefixBox: { width:80, height:56, backgroundColor:CHECK.surfaceContainerHigh, alignItems:'center', justifyContent:'center', borderRightWidth:1, borderRightColor:CHECK.divider },
  amountPrefixText: { ...FONT.labelCaps, color:CHECK.primaryContainer },
  amountPrefixDivider: { position:'absolute', right:0, top:8, bottom:8, width:1, backgroundColor:CHECK.divider },
  amountInput: { flex:1, height:56, paddingHorizontal:Spacing.md, ...FONT.monoInput, fontSize:16, backgroundColor:CHECK.surfaceContainer },
  inputError: { borderColor:CHECK.error },
  errorText: { ...FONT.bodyMd, color:CHECK.error, marginTop:4 },
  amountWordsText: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant, fontStyle:'italic', marginTop:4, paddingHorizontal:Spacing.md },
  rateSection: { marginTop:Spacing.md, flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:Spacing.sm },
  rateInputRow: { flex:1, flexDirection:'row', alignItems:'center', gap:Spacing.sm },
  rateLabel: { ...FONT.labelCaps, color:CHECK.textMuted, fontSize:10 },
  rateInputBox: { flexDirection:'row', alignItems:'center', backgroundColor:CHECK.surfaceContainerHigh, borderWidth:1, borderColor:CHECK.outlineVariant, borderRadius:R.sm, paddingHorizontal:Spacing.sm, height:28 },
  rateFieldInput: { width:64, ...FONT.monoBase, color:CHECK.primaryContainer, fontSize:12, fontWeight:'700', padding:0 },
  rateSuffix: { ...FONT.monoLabel, color:CHECK.onSurfaceVariant, fontSize:10, marginLeft:4 },
  usdPreviewBox: { flexDirection:'row', alignItems:'baseline', gap:4 },
  usdPreviewLabel: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant },
  usdPreviewValue: { ...FONT.bodyLg, color:CHECK.primaryContainer, fontFamily:Typography.fontFamily.semibold, fontWeight:'600' },
  usdPreviewUnit: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant },
  enhancedExpenseSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  enhancedExpenseHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:Spacing.sm },
  linesTotalBadge: { backgroundColor:CHECK.primaryContainer, borderWidth:1, borderColor:CHECK.primaryContainer, borderRadius:R.sm, paddingHorizontal:Spacing.sm, paddingVertical:Spacing.xs },
  linesTotalText: { ...FONT.monoLabel, color:CHECK.onPrimary, fontSize:11, fontWeight:'700' },
  enhancedExpenseHint: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant, marginBottom:Spacing.sm },
  expenseSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  expenseLineWrap: { marginBottom:Spacing.sm },
  expenseLineRow: { minHeight:48, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, backgroundColor:CHECK.surfaceContainer, paddingRight:Spacing.sm, gap:Spacing.xs },
  expenseLineRowError: { borderColor:CHECK.error },
  categorySelector: { flex:1.2, paddingLeft:Spacing.sm, paddingVertical:Spacing.sm },
  categoryButton: { flexDirection:'row', alignItems:'center', gap:Spacing.xs, backgroundColor:CHECK.surfaceContainerHigh, borderRadius:R.sm, paddingVertical:Spacing.xs, paddingHorizontal:Spacing.sm, borderWidth:1, borderColor:CHECK.border },
  categoryText: { ...FONT.bodyMd, color:CHECK.onSurface, fontSize:12 },
  categoryTextPlaceholder: { ...FONT.bodyMd, color:CHECK.outlineVariant, fontSize:12 },
  amountInputWrap: { width:100 },
  lineAmountInput: { ...FONT.monoBase, textAlign:'right', paddingVertical:Spacing.sm, paddingLeft:Spacing.xs, minWidth:80 },
  memoInputWrap: { flex:1 },
  lineMemoInput: { ...FONT.bodyMd, paddingVertical:Spacing.sm, paddingLeft:Spacing.xs, fontSize:13, minWidth:80 },
  lineDeleteBtn: { width:32, height:32, alignItems:'center', justifyContent:'center' },
  lineErrorWrap: { flexDirection:'row', flexWrap:'wrap', gap:Spacing.sm, marginTop:4, paddingLeft:4 },
  lineErrorText: { ...FONT.bodyMd, color:CHECK.error, fontSize:11 },
  linesEmptyText: { ...FONT.bodyMd, color:CHECK.textMuted, textAlign:'center', paddingVertical:Spacing.lg },
  addLineButton: { flexDirection:'row', alignItems:'center', justifyContent:'center', height:48, borderWidth:1, borderStyle:'dashed', borderColor:CHECK.outlineVariant, borderRadius:R.default, backgroundColor:'transparent', gap:Spacing.sm, marginTop:Spacing.sm },
  addLineButtonText: { fontFamily:Typography.fontFamily.semibold, fontSize:12, color:CHECK.onSurfaceVariant, letterSpacing:0.5, textTransform:'uppercase' },
  paymentSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  cashOnlyBadge: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:CHECK.primaryContainer, borderRadius:R.default, paddingVertical:Spacing.sm, height:48 },
  cashOnlyText: { ...FONT.monoLabel, color:CHECK.onPrimary, fontSize:14, fontWeight:'700', letterSpacing:0.5 },
  memoSection: { paddingHorizontal:Spacing.base, paddingTop:Spacing.base },
  memoTextarea: { backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, padding:Spacing.md, ...FONT.bodyMd, height:100, textAlignVertical:'top' },
  charCounter: { ...FONT.monoLabel, color:CHECK.outlineVariant, textAlign:'right', marginTop:4 },
  charCounterWarning: { color:CHECK.amber },
  checkPreviewCard: { marginHorizontal:Spacing.base, marginTop:Spacing.base, backgroundColor:CHECK.checkPreviewBg, borderWidth:1, borderColor:CHECK.border, borderTopWidth:3, borderTopColor:CHECK.checkPreviewTop, borderRadius:R.lg, padding:Spacing.base },
  checkHeaderRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  checkStationRef: { ...FONT.labelCaps, color:CHECK.amber, marginBottom:2 },
  checkRefText: { ...FONT.monoLabel, color:CHECK.textMuted, fontSize:12 },
  checkFieldLabel: { ...FONT.labelCaps, color:CHECK.textMuted, marginBottom:2 },
  checkFieldValue: { ...FONT.monoBase, fontWeight:'600', color:CHECK.onSurface },
  checkDivider: { height:1, backgroundColor:CHECK.divider, marginVertical:Spacing.sm },
  checkRow: { flexDirection:'row', alignItems:'baseline', gap:Spacing.sm },
  checkValue: { ...FONT.bodyLg, fontWeight:'700', flexShrink:1 },
  checkValueItalic: { fontFamily:Typography.fontFamily.mono, fontSize:14, fontStyle:'italic', color:CHECK.onSurface, flexShrink:1 },
  checkBottomRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginTop:Spacing.sm },
  checkBalanceValue: { ...FONT.bodyLg, fontFamily:Typography.fontFamily.mono, color:CHECK.onSurface },
  amountBox: { backgroundColor:CHECK.surfaceContainerHigh, borderWidth:1, borderColor:CHECK.outlineVariant, borderRadius:R.default, padding:Spacing.sm, paddingHorizontal:Spacing.md, minWidth:140, alignItems:'flex-end' },
  amountBoxValue: { ...FONT.statValue, color:CHECK.amber, letterSpacing:-0.5 },
  actionBar: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(19,19,19,0.85)', borderTopWidth:1, borderTopColor:CHECK.border, paddingHorizontal:Spacing.base, paddingTop:Spacing.md, paddingBottom:Platform.OS==='ios'?Spacing['2xl']:Spacing.md },
  saveCloseButton: { backgroundColor:CHECK.primaryContainer, borderRadius:R.lg, height:56, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:Spacing.sm, marginBottom:Spacing.sm },
  buttonDisabled: { opacity:0.6 },
  saveCloseText: { fontFamily:Typography.fontFamily.mono, fontSize:14, fontWeight:'700', color:CHECK.onPrimary, letterSpacing:0.5, textTransform:'uppercase' },
  secondaryActionsRow: { flexDirection:'row', gap:Spacing.sm },
  secondaryButton: { flex:1, height:48, alignItems:'center', justifyContent:'center', borderRadius:R.default },
  saveNewButtonBase: { borderWidth:1, borderColor:CHECK.outlineVariant, backgroundColor:'transparent' },
  clearButtonBase: { borderWidth:1, borderColor:CHECK.border, backgroundColor:'transparent' },
  saveNewText: { fontFamily:Typography.fontFamily.mono, fontSize:12, fontWeight:'700', color:CHECK.onSurfaceVariant, letterSpacing:0.5, textTransform:'uppercase' },
  clearText: { fontFamily:Typography.fontFamily.mono, fontSize:12, fontWeight:'700', color:CHECK.textMuted, letterSpacing:0.5, textTransform:'uppercase' },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:Spacing.base },
  confirmModal: { backgroundColor:CHECK.surfaceContainerHigh, borderRadius:R.lg, padding:Spacing.xl, width:'100%', maxWidth:320 },
  confirmTitle: { fontSize:20, fontWeight:'600', fontFamily:Typography.fontFamily.display, color:CHECK.onSurface, marginBottom:Spacing.sm },
  confirmMessage: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant, marginBottom:Spacing.lg },
  confirmActions: { flexDirection:'row', gap:Spacing.sm },
  confirmCancelButton: { flex:1, height:48, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, alignItems:'center', justifyContent:'center', backgroundColor:'transparent' },
  confirmCancelText: { ...FONT.monoLabel, color:CHECK.textMuted },
  confirmClearButton: { flex:1, height:48, backgroundColor:CHECK.primaryContainer, borderRadius:R.default, alignItems:'center', justifyContent:'center' },
  confirmClearText: { ...FONT.monoLabel, color:CHECK.onPrimary },
  calendarOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:Spacing.base },
  calendarCard: { backgroundColor:CHECK.surfaceContainerHigh, borderRadius:R.lg, padding:Spacing.xl, width:'100%', maxWidth:340 },
  calendarHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:Spacing.base },
  calendarNavBtn: { width:44, height:44, alignItems:'center', justifyContent:'center' },
  calendarTitle: { ...FONT.labelCaps, color:CHECK.primaryContainer, fontSize:12 },
  calendarWeekRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:Spacing.sm },
  calendarWeekText: { ...FONT.monoLabel, color:CHECK.onSurfaceVariant, width:32, textAlign:'center' },
  calendarGrid: { flexDirection:'row', flexWrap:'wrap' },
  calendarCellEmpty: { width:32, height:32 },
  calendarCell: { width:32, height:32, alignItems:'center', justifyContent:'center', borderRadius:16 },
  calendarCellSelected: { backgroundColor:CHECK.primaryContainer },
  calendarCellToday: { borderWidth:1, borderColor:CHECK.primaryContainer },
  calendarCellText: { ...FONT.bodyMd, color:CHECK.onSurface, fontSize:13 },
  calendarCellTextSelected: { color:CHECK.onPrimary, fontWeight:'700' },
  calendarCellTextToday: { color:CHECK.onSurface },
  accountPickerItem: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:Spacing.md, borderBottomWidth:1, borderBottomColor:CHECK.divider, minHeight:64 },
  accountPickerLeft: { flexDirection:'row', alignItems:'center', gap:Spacing.sm, flex:1 },
  accountPickerName: { ...FONT.bodyMd, color:CHECK.onSurface, fontWeight:'600', fontSize:14 },
  accountPickerMeta: { ...FONT.bodyMd, color:CHECK.onSurfaceVariant, fontSize:12, marginTop:2 },
  accountPickerRight: { justifyContent:'flex-end' },
  accountPickerBalance: { ...FONT.monoBase, color:CHECK.primaryContainer, fontWeight:'600', fontSize:13 },
  categorySearchRow: { flexDirection:'row', alignItems:'center', backgroundColor:CHECK.surfaceContainer, borderWidth:1, borderColor:CHECK.border, borderRadius:R.default, height:48, paddingHorizontal:Spacing.md, marginBottom:Spacing.sm },
  categorySearchIcon: { marginRight:Spacing.sm },
  categorySearchInput: { flex:1, height:48, ...FONT.interInput },
  categoryPickerItem: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:Spacing.md, borderBottomWidth:1, borderBottomColor:CHECK.divider, minHeight:48 },
  categoryPickerLeft: { flexDirection:'row', alignItems:'center', gap:Spacing.sm },
  categoryPickerText: { ...FONT.bodyMd, color:CHECK.onSurface, fontSize:14 },
  categoryList: { maxHeight:320 },
};