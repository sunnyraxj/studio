'use client';

import { format, isValid, parse } from 'date-fns';
import React, { useId, useState, useEffect } from 'react';
import { DayPicker, type DayPickerSingleProps } from 'react-day-picker';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InputDayPickerProps = {
  onDateChange: (date: Date | undefined) => void;
};

/** Render an input field bound to a DayPicker calendar. */
export function InputDayPicker({ onDateChange }: InputDayPickerProps) {
  const inputId = useId();

  // Hold the month in state to control the calendar when the input changes
  const [month, setMonth] = useState(new Date());

  // Hold the selected date in state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Hold the input value in state
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    onDateChange(selectedDate);
  }, [selectedDate, onDateChange]);

  /**
   * Function to handle the DayPicker select event: update the input value and
   * the selected date, and set the month.
   */
  const handleDayPickerSelect: DayPickerSingleProps['onSelect'] = (date) => {
    if (!date) {
      setInputValue('');
      setSelectedDate(undefined);
    } else {
      setSelectedDate(date);
      setMonth(date);
      setInputValue(format(date, 'MM/dd/yyyy'));
    }
  };

  /**
   * Handle the input change event: parse the input value to a date, update the
   * selected date and set the month.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // keep the input value in sync

    const parsedDate = parse(e.target.value, 'MM/dd/yyyy', new Date());

    if (isValid(parsedDate)) {
      setSelectedDate(parsedDate);
      setMonth(parsedDate);
    } else {
      setSelectedDate(undefined);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        <strong>Pick a date</strong>
      </Label>
      <UIInput
        id={inputId}
        type="text"
        value={inputValue}
        placeholder="MM/dd/yyyy"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          // Fixes https://github.com/gpbl/react-day-picker/issues/2724 causing search appearing when typing '/'
          e.stopPropagation();
        }}
      />
      <div style={{ marginBlock: '1em' }}>
        <DayPicker
          month={month}
          onMonthChange={setMonth}
          mode="single"
          selected={selectedDate}
          onSelect={handleDayPickerSelect}
          footer={
            selectedDate
              ? `Selected: ${format(selectedDate, 'PPP')}`
              : 'Please pick a day.'
          }
        />
      </div>
    </div>
  );
}
