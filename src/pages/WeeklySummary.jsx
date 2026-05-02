import React from "react";
import { useNavigate } from "react-router-dom";
import { GameSave } from "@/lib/localEntities";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VILLAGES } from "@/lib/gameData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowRight, TrendingUp, Coins, Target, Home, Award } from "lucide-react";

export default function WeeklySummary() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const saveId = urlParams.get("id");

  const { data: gameSave, isLoading } = useQuery({
    queryKey: ["gameSave", saveId],
    queryFn: () => GameSave.filter({ id: saveId }),
    enabled: !!saveId,
    select: (data) => data[0],
  });

  if (isLoading || !gameSave) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const village = VILLAGES[gameSave.village];
  const weeklySales = gameSave.weekly_sales || [];
  const lastWeek = weeklySales[weeklySales.length - 1];

  const chartData = lastWeek
    ? lastWeek.daily_totals.map((total, i) => ({
        name: `Day ${i + 1}`,
        earnings: total,
      }))
    : [];

  const weeklyTotal = lastWeek?.weekly_total || 0;
  const avgDaily = lastWeek ? weeklyTotal / lastWeek.daily_totals.length : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: 2 }}
          >
            📊
          </motion.div>
          <h1 className="font-display font-bold text-3xl text-foreground">
            Week {(gameSave.current_week || 2) - 1} Report
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            {gameSave.bakery_name} — {village?.name}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-primary" />
              <span className="font-display text-xs text-muted-foreground">Weekly Earnings</span>
            </div>
            <p className="font-display font-bold text-2xl text-foreground">
              {village?.currency}{weeklyTotal.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="font-display text-xs text-muted-foreground">Avg. Daily</span>
            </div>
            <p className="font-display font-bold text-2xl text-foreground">
              {village?.currency}{avgDaily.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-display text-xs text-muted-foreground">Customers Served</span>
            </div>
            <p className="font-display font-bold text-2xl text-foreground">
              {gameSave.total_customers_served || 0}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-accent" />
              <span className="font-display text-xs text-muted-foreground">Best Streak</span>
            </div>
            <p className="font-display font-bold text-2xl text-foreground">
              {gameSave.streak || 0}
            </p>
          </motion.div>
        </div>

        {/* Daily Earnings Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl border border-border p-5 mb-6"
          >
            <h3 className="font-display font-bold text-base mb-4 text-foreground">
              Daily Earnings
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fontFamily: "var(--font-display)" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontFamily: "var(--font-display)" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value) => [`${village?.currency}${value.toFixed(2)}`, "Earnings"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      fontFamily: "var(--font-display)",
                    }}
                  />
                  <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Bakery Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-xl border border-border p-5 mb-6"
        >
          <h3 className="font-display font-bold text-base mb-3 text-foreground">Bakery Status</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🧁</div>
            <div>
              <p className="font-display font-bold text-foreground">{gameSave.bakery_name}</p>
              <p className="font-body text-sm text-muted-foreground">
                All-time earnings: {village?.currency}{(gameSave.total_coins || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 h-12 font-display font-bold"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            onClick={() => navigate(`/play?id=${saveId}`)}
            className="flex-1 h-12 font-display font-bold"
          >
            Start Week {gameSave.current_week || 1}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}