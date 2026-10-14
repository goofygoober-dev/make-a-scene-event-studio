/*
  LET'S MAKE A SCENE — Event Calculator engine (V8)
  Pure calculation functions. No DOM access, so the same file runs in the
  browser (window.LMASCalc) and in Node tests (module.exports).
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LMASCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODELS = ['per-person', 'flat', 'percentage', 'hybrid'];

  function n(value) {
    var v = parseFloat(value);
    return isFinite(v) && v > 0 ? v : 0;
  }
  function whole(value) {
    return Math.floor(n(value));
  }

  /* Normalise ticket rows. People per ticket defaults to 1 and is never below 1. */
  function cleanTickets(tickets) {
    return (tickets || []).map(function (t, i) {
      return {
        index: i,
        name: String((t && t.name) || '').trim() || 'Ticket type ' + (i + 1),
        price: n(t && t.price),
        people: Math.max(1, whole(t && t.people) || 1),
        sold: whole(t && t.sold)
      };
    });
  }

  /* Venue fee for a given net ticket revenue and headcount. */
  function venueFee(state, netRevenue, attendance) {
    var model = MODELS.indexOf(state.model) >= 0 ? state.model : 'per-person';
    if (model === 'per-person') {
      var pp = state.pp || {};
      return Math.max(whole(pp.guarantee), attendance) * n(pp.rate);
    }
    if (model === 'flat') return n((state.flat || {}).fee);
    if (model === 'percentage') return netRevenue * (n((state.pct || {}).share) / 100);
    var hy = state.hybrid || {};
    return n(hy.base) + netRevenue * (n(hy.share) / 100);
  }

  /* Minimum commitment before anyone buys a ticket. */
  function minimumCommitment(state) {
    if (state.model === 'per-person') return whole((state.pp || {}).guarantee) * n((state.pp || {}).rate);
    if (state.model === 'flat') return n((state.flat || {}).fee);
    if (state.model === 'hybrid') return n((state.hybrid || {}).base);
    return 0;
  }

  /* Ticket mix used for break-even: weights follow tickets sold, or equal weights if none sold. */
  function ticketMix(tickets) {
    var valid = tickets.filter(function (t) { return t.price > 0; });
    var soldTotal = valid.reduce(function (s, t) { return s + t.sold; }, 0);
    return valid.map(function (t) {
      return {
        index: t.index, name: t.name, price: t.price, people: t.people,
        weight: soldTotal > 0 ? t.sold / soldTotal : 1 / valid.length
      };
    });
  }

  /* Split a ticket total across the mix using largest-remainder rounding. */
  function allocate(total, mix) {
    if (!mix.length || total <= 0) return mix.map(function () { return 0; });
    var raw = mix.map(function (t) { return total * t.weight; });
    var counts = raw.map(Math.floor);
    var remaining = total - counts.reduce(function (s, c) { return s + c; }, 0);
    raw.map(function (v, i) { return { i: i, f: v - Math.floor(v) }; })
      .sort(function (a, b) { return b.f - a.f || a.i - b.i; })
      .slice(0, remaining)
      .forEach(function (x) { counts[x.i] += 1; });
    return counts;
  }

  function depositTotals(deposits) {
    var included = 0, extra = 0;
    (deposits || []).forEach(function (d) {
      if (d && d.onTop) extra += n(d.amount); else included += n(d && d.amount);
    });
    return { included: included, extra: extra };
  }

  function expenseTotal(expenses) {
    return (expenses || []).reduce(function (s, e) { return s + n(e && e.amount); }, 0);
  }

  /* Smallest number of tickets (in the current mix) where profit >= 0. */
  function breakEven(state, tickets, production, extraDeposits) {
    var mix = ticketMix(tickets);
    var fee = n(state.platformFeePct);
    var comps = whole(state.compGuests);
    if (!mix.length) return { possible: false, tickets: 0, people: 0, counts: [], mix: mix };

    function at(total) {
      var counts = allocate(total, mix);
      var gross = 0, people = 0;
      counts.forEach(function (c, i) { gross += c * mix[i].price; people += c * mix[i].people; });
      var net = gross * (1 - fee / 100);
      var profit = net - venueFee(state, net, people + comps) - extraDeposits - production;
      return { profit: profit, counts: counts, people: people };
    }

    var zero = at(0);
    if (zero.profit >= 0) return { possible: true, tickets: 0, people: 0, counts: zero.counts, mix: mix };
    var high = 1, LIMIT = 1e6;
    while (high < LIMIT && at(high).profit < 0) high *= 2;
    if (at(high).profit < 0) return { possible: false, tickets: 0, people: 0, counts: [], mix: mix };
    var low = 0;
    while (low + 1 < high) {
      var mid = Math.floor((low + high) / 2);
      if (at(mid).profit >= 0) high = mid; else low = mid;
    }
    var r = at(high);
    return { possible: true, tickets: high, people: r.people, counts: r.counts, mix: mix };
  }

  /*
    Signal states drive the Rabbit's mood and the planning headline.
    Colour is never the only signal: each state carries a label and copy.
  */
  function signal(r) {
    if (r.overCapacity) {
      return { key: 'capacity', mood: 'thinking', label: 'Over capacity',
        headline: 'More people than the room holds.',
        text: 'Attendance (' + r.attendance + ') is above the venue capacity of ' + r.capacity + '. Trim releases or comps, or confirm the room can legally hold everyone.' };
    }
    if (r.ticketsSold === 0 && r.gross === 0) {
      return { key: 'empty', mood: 'curious', label: 'No sales yet',
        headline: 'Set the stage.',
        text: 'Add ticket types and what you expect to sell to see how the night shapes up.' };
    }
    if (r.netProfit < 0) {
      return { key: 'loss', mood: 'thinking', label: 'Loss',
        headline: 'This one costs us.',
        text: 'Sales don’t yet cover the venue and production. Lift prices or sales, cut costs, or renegotiate the venue terms.' };
    }
    if (r.margin < 10) {
      return { key: 'tight', mood: 'surprised', label: 'Tight',
        headline: 'Tight, but possible.',
        text: 'In profit, but one surprise cost could tip it. Keep a buffer for breakages, cleaning or a no-show performer.' };
    }
    if (r.margin < 25) {
      return { key: 'workable', mood: 'happy', label: 'Workable',
        headline: 'A workable margin.',
        text: 'Costs are covered with room to breathe. Good time to lock in deposits.' };
    }
    return { key: 'strong', mood: 'confident', label: 'Strong',
      headline: 'Now that’s a scene.',
      text: 'Healthy margin. Room to pay facilitators well, upgrade the space, or put some aside for the next one.' };
  }

  function compute(state) {
    state = state || {};
    var tickets = cleanTickets(state.tickets);
    var feePct = n(state.platformFeePct);
    var comps = whole(state.compGuests);
    var capacity = whole(state.capacity);

    var gross = 0, ticketsSold = 0, payingPeople = 0;
    tickets.forEach(function (t) {
      t.revenue = t.price * t.sold;
      gross += t.revenue;
      ticketsSold += t.sold;
      payingPeople += t.sold * t.people;
    });
    var attendance = payingPeople + comps;
    var platformFees = gross * (feePct / 100);
    var netRevenue = gross - platformFees;

    var fee = venueFee(state, netRevenue, attendance);
    var deps = depositTotals(state.deposits);
    var production = expenseTotal(state.expenses);
    var venueCost = fee + deps.extra;
    var balanceRaw = fee - deps.included;
    var netProfit = netRevenue - venueCost - production;
    var totalCosts = platformFees + venueCost + production;
    var margin = gross > 0 ? (netProfit / gross) * 100 : 0;

    var be = breakEven(state, tickets, production, deps.extra);

    var tiers = tickets.map(function (t) {
      var share = gross > 0 ? t.revenue / gross : 0;
      var cost = totalCosts * share;
      return {
        name: t.name, price: t.price, people: t.people, sold: t.sold, revenue: t.revenue,
        costPerTicket: t.sold > 0 ? cost / t.sold : 0,
        profitPerTicket: t.sold > 0 ? (t.revenue - cost) / t.sold : 0
      };
    });

    var result = {
      tickets: tickets, tiers: tiers,
      gross: gross, ticketsSold: ticketsSold, payingPeople: payingPeople, comps: comps,
      attendance: attendance, capacity: capacity,
      overCapacity: capacity > 0 && attendance > capacity,
      platformFees: platformFees, netRevenue: netRevenue,
      venueFee: fee, minimumCommitment: minimumCommitment(state),
      includedDeposits: deps.included, extraDeposits: deps.extra,
      venueCost: venueCost,
      balanceDue: Math.max(0, balanceRaw),
      venueCredit: Math.max(0, -balanceRaw),
      production: production, totalCosts: totalCosts,
      netProfit: netProfit, margin: margin,
      breakEven: be,
      breakEvenProgress: be.possible ? (be.tickets === 0 ? 100 : Math.min(100, (ticketsSold / be.tickets) * 100)) : 0,
      breakEvenOverCapacity: be.possible && capacity > 0 && (be.people + comps) > capacity
    };
    result.signal = signal(result);
    return result;
  }

  /*
    Migrate saved data from earlier calculator versions.
    v2 (live before Oct 2026): { flat:{...field ids}, tickets:[{name,price,sold}], expenses:[{desc,due,amount}], deposits:[{desc,due,amount,addedOnTop}] }
    v1 (event studio): { eventName, modelType, tickets:[{name,price,guests,sold}], expenses:[{name,date,amount}], deposits:[{name,date,amount}] }
    v2 had no people-per-ticket field, so pair/couple names default to 2 people for review.
  */
  function guessPeople(name) {
    return /\b(couple|couples|pair|pairs|double|duo)\b/i.test(String(name || '')) ? 2 : 1;
  }

  function migrate(saved) {
    if (!saved || typeof saved !== 'object') return null;
    if (saved.version === 8) return saved;

    if (saved.flat) {
      var f = saved.flat;
      return {
        version: 8,
        eventName: f.eventName || '', eventDate: f.eventDate || '', venue: f.venueLocation || '',
        capacity: '', platformFeePct: f.platformFeePct || '',
        model: MODELS.indexOf(f.pricingModel) >= 0 ? f.pricingModel : 'per-person',
        pp: { guarantee: f['pp-guarantee'] || '', rate: f['pp-rate'] || '' },
        flat: { fee: f['flat-fee'] || '' },
        pct: { share: f['pct-share'] || '' },
        hybrid: { base: f['hy-flat'] || '', share: f['hy-pct'] || '' },
        compGuests: f.compGuests || '',
        tickets: (saved.tickets || []).map(function (t) {
          return { name: t.name || '', price: t.price, people: t.people || guessPeople(t.name), sold: t.sold };
        }),
        expenses: (saved.expenses || []).map(function (e) { return { desc: e.desc || '', due: e.due || '', amount: e.amount }; }),
        deposits: (saved.deposits || []).map(function (d) { return { desc: d.desc || '', due: d.due || '', amount: d.amount, onTop: !!d.addedOnTop }; }),
        migratedFrom: 'v2'
      };
    }

    if (saved.tickets && saved.modelType) {
      var map = { PER_PERSON: 'per-person', FLAT_FEE: 'flat', PERCENTAGE_SHARE: 'percentage', HYBRID: 'hybrid' };
      return {
        version: 8,
        eventName: saved.eventName || '', eventDate: saved.eventDate || '', venue: saved.eventVenue || '',
        capacity: '', platformFeePct: '',
        model: map[saved.modelType] || 'per-person',
        pp: { guarantee: saved.minPax || '', rate: saved.ratePerHead || '' },
        flat: { fee: saved.flatFee || '' },
        pct: { share: saved.percentage || '' },
        hybrid: { base: saved.flatFee || '', share: saved.percentage || '' },
        compGuests: '',
        tickets: saved.tickets.map(function (t) { return { name: t.name || '', price: t.price, people: t.guests || 1, sold: t.sold }; }),
        expenses: (saved.expenses || []).map(function (e) { return { desc: e.name || '', due: e.date || '', amount: e.amount }; }),
        deposits: (saved.deposits || []).map(function (d) { return { desc: d.name || '', due: d.date || '', amount: d.amount, onTop: false }; }),
        migratedFrom: 'v1'
      };
    }
    return null;
  }

  function money(value) {
    var v = Math.round(Number(value) || 0);
    var s = '$' + Math.abs(v).toLocaleString('en-AU');
    return v < 0 ? '−' + s : s;
  }

  return {
    MODELS: MODELS, compute: compute, venueFee: venueFee, allocate: allocate,
    ticketMix: ticketMix, migrate: migrate, guessPeople: guessPeople, money: money
  };
});
