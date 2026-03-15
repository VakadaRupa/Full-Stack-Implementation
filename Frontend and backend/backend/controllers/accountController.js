import  supabase  from '../config/supabaseClient.js';

export const getBalance = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', req.user?.id)
      .single();

    if (error) throw error;

    if (user) {
      res.json({ balance: user.balance });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

export const getStatement = async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        transaction_type,
        created_at,
        sender_id,
        receiver_id,
        sender:users!transactions_sender_id_fkey(name),
        receiver:users!transactions_receiver_id_fkey(name)
      `)
      .or(`and(sender_id.eq.${req.user?.id},transaction_type.eq.debit),and(receiver_id.eq.${req.user?.id},transaction_type.eq.credit)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTransactions = transactions?.map((t) => {
      const isSender = t.sender_id === req.user?.id;
      return {
        id: t.id,
        date: t.created_at,
        type: t.transaction_type === 'debit' ? 'Debit' : 'Credit',
        amount: t.amount,
        from: isSender ? 'You' : t.sender?.name,
        to: isSender ? t.receiver?.name : 'You',
      };
    });

    res.json(formattedTransactions);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

export const transferMoney = async (req, res) => {
  const { receiver_id, amount } = req.body;
  const sender_id = req.user?.id;

  if (!sender_id) return res.status(401).json({ message: 'Not authorized' });

  if (sender_id === receiver_id) {
    return res.status(400).json({ message: 'Cannot transfer to yourself' });
  }

  if (amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  try {
    // 1. Get sender balance
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', sender_id)
      .single();

    if (senderError) throw senderError;

    if (!sender || sender.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 2. Get receiver
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // 3. Update sender balance
    const { error: updateSenderError } = await supabase
      .from('users')
      .update({ balance: sender.balance - amount })
      .eq('id', sender_id);

    if (updateSenderError) throw updateSenderError;

    // 4. Update receiver balance
    const { error: updateReceiverError } = await supabase
      .from('users')
      .update({ balance: receiver.balance + amount })
      .eq('id', receiver_id);

    if (updateReceiverError) {
      // Rollback sender balance (simplified)
      await supabase
        .from('users')
        .update({ balance: sender.balance })
        .eq('id', sender_id);
      throw updateReceiverError;
    }

    // 5. Insert transaction records (two entries as per requirements)
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          sender_id: sender_id,
          receiver_id: receiver_id,
          amount,
          transaction_type: 'debit',
        },
        {
          sender_id: sender_id,
          receiver_id: receiver_id,
          amount,
          transaction_type: 'credit',
        },
      ]);

    if (transactionError) throw transactionError;

    res.json({ message: 'Transfer successful' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email')
      .neq('id', req.user?.id);

    if (error) throw error;

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};
