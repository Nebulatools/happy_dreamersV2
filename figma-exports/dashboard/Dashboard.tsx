"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar,
  Clock, 
  Moon, 
  Sun, 
  Heart,
  Activity,
  TrendingUp,
  Bell,
  Settings,
  User,
  Baby,
  BarChart3,
  PieChart,
  LineChart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Send,
  Lightbulb,
  ArrowRight
} from 'lucide-react'

interface DashboardProps {
  className?: string
}

export function Dashboard({ className = "" }: DashboardProps) {
  return (
    <div className={`min-h-screen bg-[#EFFFFF] flex ${className}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#68A1C8] to-[#3993D1] shadow-lg">
        <div className="p-6">
          {/* Logo */}
          <div className="mb-12 flex justify-center">
            <div className="w-40 h-24 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 164 105" fill="none">
                {/* Simplified logo based on Figma design */}
                <rect x="0" y="17" width="22" height="37" fill="#DEF1F1"/>
                <rect x="24" y="28" width="19" height="24" fill="#DEF1F1"/>
                <rect x="45" y="26" width="36" height="37" fill="#DEF1F1"/>
                <rect x="84" y="28" width="17" height="36" fill="#DEF1F1"/>
                <text x="0" y="100" fill="#DEF1F1" fontSize="12" fontFamily="Century Gothic">HAPPY DREAMERS</text>
              </svg>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-4">
            <div className="bg-[#DEF1F1] rounded-xl p-3 flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#68A1C8]" />
              </div>
              <span className="text-[#68A1C8] font-medium text-sm">Dashboard</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#DEF1F1] text-sm pl-3">
                <Calendar className="w-4 h-4" />
                <span>Análisis de Sueño</span>
              </div>
              <div className="flex items-center gap-3 text-[#DEF1F1] text-sm pl-3">
                <Calendar className="w-4 h-4" />
                <span>Calendario</span>
              </div>
              <div className="flex items-center gap-3 text-[#DEF1F1] text-sm pl-3">
                <Moon className="w-4 h-4" />
                <span>Diario de Sueño</span>
              </div>
              <div className="flex items-center gap-3 text-[#DEF1F1] text-sm pl-3">
                <Lightbulb className="w-3 h-4" />
                <span>Consejos</span>
              </div>
              <div className="flex items-center gap-3 text-[#DEF1F1] text-sm pl-3">
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </div>
            </div>
          </nav>
        </div>
        
        {/* Premium Plan Card */}
        <div className="mx-6 mb-6">
          <div className="bg-[#FCF7C3] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 bg-[#F3E185] rounded flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-[#68A1C8]" />
              </div>
              <h3 className="font-bold text-lg text-[#68A1C8]">Plan Premium</h3>
            </div>
            <p className="text-sm text-[#666666] mb-4">
              Accede a todas las funciones<br />
              y análisis avanzados
            </p>
            <Button className="w-full bg-[#F3E185] text-[#A49B48] hover:bg-[#F0E082] rounded-lg">
              Actualizar Plan
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-[#A0D8D0] shadow-sm border-b border-[#E5E7EB]">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#EFFFFF]">Dashboard</h1>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="bg-[#DEF1F1] rounded-full px-5 py-3 flex items-center gap-2 w-72">
                <Search className="w-5 h-5 text-[#68A1C8]" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="bg-transparent text-[#68A1C8] placeholder-[#68A1C8] outline-none flex-1"
                />
              </div>
              
              {/* Child Selector */}
              <Button className="bg-[#DEF1F1] text-[#68A1C8] hover:bg-[#D0EEE8] rounded-xl px-4 py-3 flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-r from-pink-400 to-pink-500 text-white text-sm">
                    S
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">Sofía</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
              
              {/* Notifications */}
              <Button variant="ghost" className="p-2 relative">
                <Bell className="w-4 h-4 text-[#DEF1F1]" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#DF3F40] rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">3</span>
                </div>
              </Button>
              
              {/* Profile */}
              <div className="flex items-center gap-2">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
                    M
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3 h-3 text-[#DEF1F1]" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-[#2F2F2F] mb-2">¡Buenos días, María!</h2>
            <p className="text-[#666666] text-sm">Aquí tienes un resumen del sueño de Sofía de los últimos 7 días.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#666666] mb-1">Tiempo total de sueño (promedio)</p>
                    <div className="text-3xl font-bold text-[#2F2F2F]">9.5h</div>
                  </div>
                  <div className="w-10 h-10 bg-[#B7F1C0] rounded-xl flex items-center justify-center">
                    <Moon className="w-3 h-3 text-[#3EAE50]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#E6F9EF] text-[#22B07D] border-0 text-xs px-2 py-1">Bueno</Badge>
                  <span className="text-xs text-[#666666]">+0.5h vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#666666] mb-1">Hora de acostarse (promedio)</p>
                    <div className="text-3xl font-bold text-[#2F2F2F]">20:30</div>
                  </div>
                  <div className="w-10 h-10 bg-[#D4C1FF] rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-4 text-[#8666D2]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#D4C1FF] text-[#8666D2] border-0 text-xs px-2 py-1">Consistente</Badge>
                  <span className="text-xs text-[#666666]">±15 min de variación</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-[#666666] mb-1">Despertares nocturnos (promedio)</p>
                    <div className="text-3xl font-bold text-[#2F2F2F]">1.2</div>
                  </div>
                  <div className="w-8 h-10 bg-[#FFE442] rounded-xl flex items-center justify-center">
                    <Moon className="w-3 h-4 text-[#F5A623]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FFF6E6] text-[#E5A43B] border-0 text-xs px-2 py-1">Promedio</Badge>
                  <span className="text-xs text-[#666666]">-0.3 vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm text-[#666666] mb-1">Calidad del sueño</p>
                    <div className="text-3xl font-bold text-[#2F2F2F]">40%</div>
                  </div>
                  <div className="w-10 h-10 bg-[#FFC4C4] rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#EC6A6A]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FFC4C4] text-[#EC6A6A] border-0 text-xs px-2 py-1">Mala</Badge>
                  <span className="text-xs text-[#666666]">-20 % vs. semana anterior</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sleep Trend Chart */}
              <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#2F2F2F]">Tendencia de Sueño</h3>
                    <div className="flex gap-2">
                      <Button className="bg-[#DEF1F1] text-[#68A1C8] hover:bg-[#D0EEE8] text-sm px-3 py-1 rounded-lg">
                        7 días
                      </Button>
                      <Button variant="outline" className="text-sm px-3 py-1 rounded-lg">
                        30 días
                      </Button>
                      <Button variant="outline" className="text-sm px-3 py-1 rounded-lg">
                        3 meses
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center relative">
                    <div className="absolute top-24 left-80 w-12 h-12 bg-[#DEF1F1] rounded-xl flex items-center justify-center">
                      <Moon className="w-6 h-6 text-[#68A1C8]" />
                    </div>
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Gráfico de tendencia de sueño</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mood States */}
              <Card className="bg-white shadow-sm border border-[#19305C]/10 rounded-2xl">
                <CardHeader className="p-6 pb-4">
                  <h3 className="text-lg font-bold text-[#2F2F2F]">Estado de Ánimo</h3>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    {[
                      { day: "Hoy", mood: "Feliz", color: "bg-[#E9F7F1] text-[#22B07D]" },
                      { day: "Ayer", mood: "Energético", color: "bg-[#E9F7F1] text-[#22B07D]" },
                      { day: "Lunes", mood: "Cansado", color: "bg-[#FFF4E5] text-[#F5A623]" },
                      { day: "Domingo", mood: "Estresado", color: "bg-[#FFD6D6] text-[#FF8080]" },
                      { day: "Sábado", mood: "Feliz", color: "bg-[#E9F7F1] text-[#22B07D]" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#DEF1F1] rounded-full flex items-center justify-center">
                          <Sun className="w-3 h-4 text-[#68A1C8]" />
                        </div>
                        <span className="text-sm text-[#3A3A3A] w-16">{item.day}</span>
                        <Badge className={`${item.color} border-0 px-3 py-1 text-sm`}>
                          {item.mood}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Sleep Calendar */}
              <Card className="bg-white shadow-sm border border-[#68A1C8]/10 rounded-2xl">
                <CardHeader className="p-6 pb-4">
                  <h3 className="text-lg font-bold text-[#2F2F2F]">Calendario de Sueño</h3>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#3A3A3A]">Mayo 2025</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="w-7 h-7 p-0 bg-[#F0F7FF] rounded-full">
                          <ChevronLeft className="w-3 h-3 text-[#68A1C8]" />
                        </Button>
                        <Button variant="ghost" size="sm" className="w-7 h-7 p-0 bg-[#F0F7FF] rounded-full">
                          <ChevronRight className="w-3 h-3 text-[#68A1C8]" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 text-xs">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                        <div key={day} className="text-center text-[#666666] font-medium py-1">
                          {day}
                        </div>
                      ))}
                      
                      {/* Calendar Days */}
                      <div className="text-center text-[#9CA3AF] py-1">29</div>
                      <div className="text-center text-[#9CA3AF] py-1">30</div>
                      <div className="text-center text-[#3A3A3A] py-1">1</div>
                      <div className="text-center text-[#3A3A3A] py-1">2</div>
                      <div className="text-center text-[#3A3A3A] py-1">3</div>
                      <div className="text-center text-[#3A3A3A] py-1">4</div>
                      <div className="text-center py-1">
                        <span className="bg-[#EC6A6A] text-white px-2 py-1 rounded-full text-xs">5</span>
                      </div>
                      <div className="text-center text-[#3A3A3A] py-1">6</div>
                      <div className="text-center py-1">
                        <span className="bg-[#F5A623] text-white px-2 py-1 rounded-full text-xs">7</span>
                      </div>
                      <div className="text-center py-1">
                        <span className="bg-[#3EAE50] text-white px-2 py-1 rounded-full text-xs">8</span>
                      </div>
                      <div className="text-center text-[#3A3A3A] py-1">9</div>
                      <div className="text-center text-[#3A3A3A] py-1">10</div>
                      <div className="text-center text-[#3A3A3A] py-1">11</div>
                      <div className="text-center text-[#3A3A3A] py-1">12</div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#22B07D] rounded-full"></div>
                        <span className="text-[#666666]">Buena calidad</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#F5A623] rounded-full"></div>
                        <span className="text-[#666666]">Regular</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#DF3F40] rounded-full"></div>
                        <span className="text-[#666666]">Mala</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Notes */}
              <Card className="bg-white shadow-sm border border-[#68A1C8]/10 rounded-2xl">
                <CardHeader className="p-6 pb-4">
                  <h3 className="text-lg font-bold text-[#2F2F2F]">Notas Recientes</h3>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    {/* Chat messages */}
                    <div className="space-y-3">
                      <div className="bg-[#A0D8D0] rounded-t-2xl rounded-br-2xl p-3 ml-12">
                        <p className="text-sm text-[#3A3A3A]">
                          Recomendacion de acotar a sofi a la misma hr 
                        </p>
                        <span className="text-xs text-[#666666]">Ayer, 23:15</span>
                      </div>
                      
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-500 text-white text-sm">
                            M
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-[#DEF1F1] rounded-t-2xl rounded-br-2xl p-3">
                          <p className="text-sm text-[#3A3A3A]">
                            Sofi se levanto a media noche otra vez
                          </p>
                          <span className="text-xs text-[#666666]">7 Mayo, 08:30</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Input area */}
                    <div className="flex gap-2 mt-4">
                      <input 
                        type="text"
                        placeholder="Añadir una nota..."
                        className="flex-1 bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm placeholder-[#ADAEBC] outline-none focus:border-[#68A1C8]"
                      />
                      <Button size="sm" variant="ghost" className="p-2">
                        <Send className="w-4 h-4 text-[#5D9ECA]" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Tips */}
              <Card className="bg-white shadow-sm border border-[#68A1C8]/10 rounded-2xl">
                <CardHeader className="p-6 pb-4">
                  <h3 className="text-lg font-bold text-[#2F2F2F]">Consejos Personalizados</h3>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="bg-[#FCF7C3] rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <Lightbulb className="w-3 h-4 text-[#68A1C8]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[#68A1C8] text-sm mb-1">Mantén un horario regular</h4>
                        <p className="text-xs text-[#666666]">
                          Acostar a Sofía todos los días a la misma hora ayuda a regular su reloj biológico.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#DEF1F1] rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <Moon className="w-3 h-3 text-[#68A1C8]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[#68A1C8] text-sm mb-1">Ambiente de sueño</h4>
                        <p className="text-xs text-[#666666]">
                          Una habitación oscura, tranquila y ligeramente fresca promueve un mejor descanso.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" className="w-full text-[#68A1C8] text-sm p-2">
                    Ver todos los consejos
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
