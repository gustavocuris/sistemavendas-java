import React, { useState } from 'react'

export default function DatePicker({ value, onChange, currentMonth }) {
  const [showCalendar, setShowCalendar] = useState(false)
  
  // Usa o mês/ano da tabela (currentMonth) ou o valor selecionado ou a data atual
  const getInitialDate = () => {
    if (value) return new Date(value + 'T00:00:00')
    if (currentMonth) {
      const [year, month] = currentMonth.split('-')
      return new Date(parseInt(year), parseInt(month) - 1)
    }
    return new Date()
  }
  
  const [currentDate, setCurrentDate] = useState(getInitialDate())
  
  // Atualiza quando currentMonth mudar
  React.useEffect(() => {
    if (currentMonth && !value) {
      const [year, month] = currentMonth.split('-')
      setCurrentDate(new Date(parseInt(year), parseInt(month) - 1))
    }
  }, [currentMonth, value])

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDayClick = (day) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const year = selected.getFullYear()
    const month = String(selected.getMonth() + 1).padStart(2, '0')
    const date = String(selected.getDate()).padStart(2, '0')
    onChange(`${year}-${month}-${date}`)
    setShowCalendar(false)
  }

  const handleToday = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const date = String(today.getDate()).padStart(2, '0')
    onChange(`${year}-${month}-${date}`)
    setCurrentDate(today)
    setShowCalendar(false)
  }

  const formatDisplayDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = []
  const years = Array.from({ length: 50 }, (_, i) => currentDate.getFullYear() - 25 + i)

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // Days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const isSelected = (day) => {
    if (!day || !value) return false
    const [y, m, d] = value.split('-')
    return currentDate.getFullYear() === parseInt(y) &&
      currentDate.getMonth() === parseInt(m) - 1 &&
      day === parseInt(d)
  }

  const isToday = (day) => {
    if (!day) return false
    const today = new Date()
    return currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate()
  }

  return (
    <div className="date-picker-container">
      <div className="date-input-with-calendar">
        <input
          type="text"
          value={formatDisplayDate(value)}
          placeholder="dd/mm/aaaa"
          onClick={() => setShowCalendar(!showCalendar)}
          readOnly
          className="date-input-field"
        />
        <button
          type="button"
          className="calendar-button"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>

      {showCalendar && (
        <div className="calendar-popup">
          <div className="calendar-navigation">
            <span className="current-month">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </div>

          <div className="calendar-weekdays">
            {weekDays.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {days.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => day && handleDayClick(day)}
                className={`day-btn ${!day ? 'empty' : ''} ${isSelected(day) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                disabled={!day}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="calendar-footer">
            <button type="button" onClick={handleToday} className="today-btn">Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}
