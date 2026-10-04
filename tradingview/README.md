# BATARA XAUUSD TradingView Indicator

Pine Script v6 indicator untuk XAUUSD dengan multi-confirmation signal engine.

## Engine
- EMA 21/55 trend
- Higher-timeframe EMA filter
- RSI momentum
- MACD histogram confirmation
- Breakout struktur
- Volume confirmation bila data volume tersedia
- ATR-based SL
- TP1 / TP2 / TP3 berbasis risk multiple
- Signal cooldown
- Confirmed-bar mode untuk mengurangi intrabar noise
- BUY / SELL alerts
- Dashboard bias dan score

## Install
1. Buka TradingView.
2. Pine Editor -> Open -> Create new.
3. Salin `tradingview/BATARA_XAUUSD_INSTITUTIONAL_v1.pine`.
4. Add to chart.
5. Gunakan XAUUSD dan pilih timeframe sesuai kebutuhan.
6. Buat Alert dari kondisi `BATARA BUY`, `BATARA SELL`, atau `BATARA SIGNAL`.

> Indikator adalah decision-support tool, bukan jaminan profit. Backtest dan forward-test sebelum digunakan dengan dana riil.
