"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart, Activity, Award, Video, LayoutDashboard } from "lucide-react"
import { containerVariants, itemVariants } from "@/lib/animations"

interface DashboardData {
  totalSummaries: number
  categoryCounts: Record<string, number>
  currentStreak: number
  weeklyData: { day: string; count: number }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token") || ""
        const res = await fetch("/api/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else if (res.status === 401) {
            window.location.href = "/login"
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gradient-soft">
        <Activity className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!data) return null

  // Find Top Category
  let topCategory = "None"
  let maxCount = 0
  Object.entries(data.categoryCounts).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count
      topCategory = cat
    }
  })

  // Max value for weekly bar chart scale
  const maxWeeklyCount = Math.max(...data.weeklyData.map(d => d.count), 1)

  return (
    <div className="min-h-screen gradient-soft p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
             <LayoutDashboard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
             Your Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Track your learning progress and analytics.</p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="card-soft p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Videos</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.totalSummaries}</h3>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card-soft p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Current Streak</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.currentStreak} Days</h3>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card-soft p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <BarChart className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Top Subject</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{topCategory}</h3>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Weekly Activity */}
           <motion.div className="card-elevated p-6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">Weekly Activity</h2>
              <div className="flex items-end justify-between h-48 gap-2">
                {data.weeklyData.map((day, i) => {
                  const heightPercentage = `${(day.count / maxWeeklyCount) * 100}%`
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                       <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         {day.count}
                       </span>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-md relative hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex-1 flex items-end">
                         <motion.div 
                           className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300"
                           initial={{ height: 0 }}
                           animate={{ height: heightPercentage }}
                           transition={{ duration: 0.8, delay: 0.3 + (i * 0.1) }}
                         />
                       </div>
                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{day.day}</span>
                    </div>
                  )
                })}
              </div>
           </motion.div>

           {/* Category Distribution */}
           <motion.div className="card-elevated p-6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">Category Distribution</h2>
              <div className="space-y-4">
                 {Object.entries(data.categoryCounts).sort((a,b)=>b[1]-a[1]).map(([cat, count], idx) => {
                   const pct = `${(count / data.totalSummaries) * 100}%`
                   return (
                     <div key={cat}>
                       <div className="flex justify-between text-sm mb-1 text-slate-600 dark:text-slate-400">
                         <span className="font-medium inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">🏷️ {cat}</span>
                         <span className="font-bold">{count}</span>
                       </div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                         <motion.div 
                           className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                           initial={{ width: 0 }}
                           animate={{ width: pct }}
                           transition={{ duration: 0.8, delay: 0.4 + (idx * 0.1) }}
                         />
                       </div>
                     </div>
                   )
                 })}
                 {Object.keys(data.categoryCounts).length === 0 && (
                   <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">No data available</div>
                 )}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  )
}
