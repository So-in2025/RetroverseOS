import { supabase } from '../services/supabase';
import { rankingService } from './rankingService';
import { withRetry } from '../utils/retry';

export type MatchResultStatus = 'win' | 'loss' | 'draw' | 'disputed';

export const resultsService = {
  async reportResult(roomId: string, gameId: string, reporterId: string, opponentId: string, status: MatchResultStatus, isAbandonment: boolean = false, isSuspicious: boolean = false) {
    if (!supabase) return false;

    // 1. Insert the report
    let report;
    try {
      report = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('match_results')
          .insert({
            room_id: roomId,
            game_id: gameId,
            reporter_id: reporterId,
            opponent_id: opponentId,
            status: status,
            reported_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    } catch (insertError) {
      console.error('Error reporting match result:', insertError);
      return false;
    }

    if (isAbandonment && report) {
      // Check if opponent already reported
      const { data: existingReports } = await supabase
        .from('match_results')
        .select('*')
        .eq('room_id', roomId)
        .neq('reporter_id', reporterId);

      if (existingReports && existingReports.length > 0) {
        // Opponent already reported! Just process normally
        await this.processRoomResults(roomId, isSuspicious);
        return true;
      }

      // Process immediately without waiting for opponent
      const p1Rank = await rankingService.getPlayerRank(reporterId);
      const p2Rank = await rankingService.getPlayerRank(opponentId);

      if (p1Rank && p2Rank && status !== 'disputed') {
        const opponentStatus = status === 'win' ? 'loss' : (status === 'loss' ? 'win' : 'draw');
        
        if (!isSuspicious) {
          // Normal abandonment (opponent left)
          await rankingService.updateRank(reporterId, p2Rank.mmr, status as 'win' | 'loss' | 'draw');
          await rankingService.updateRank(opponentId, p1Rank.mmr, opponentStatus);
          await rankingService.updateTrustScore(opponentId, -15); // Penalize leaver
        } else {
          if (status === 'draw') {
            // Desync detected
            await rankingService.updateRank(reporterId, p2Rank.mmr, 'draw');
            await rankingService.updateRank(opponentId, p1Rank.mmr, 'draw');
            // No trust score penalty for desync
          } else {
            // Suspicious abandonment (reporter cheated/macro/blur)
            // Reporter gets the loss, opponent gets the win
            await rankingService.updateRank(reporterId, p2Rank.mmr, 'loss');
            await rankingService.updateRank(opponentId, p1Rank.mmr, 'win');
            await rankingService.updateTrustScore(reporterId, -15); // Penalize cheater
          }
        }
      }

      await supabase
        .from('match_results')
        .update({ processed: true })
        .eq('id', report.id);
        
      await supabase
        .from('netplay_rooms')
        .update({ status: 'closed' })
        .eq('id', roomId);
    } else {
      // 2. Check if the opponent has also reported
      await this.processRoomResults(roomId, isSuspicious);
    }

    return true;
  },

  async processRoomResults(roomId: string, isSuspicious: boolean = false) {
    if (!supabase) return;

    try {
      // Fetch all unprocessed reports for this room
      const reports = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('match_results')
          .select('*')
          .eq('room_id', roomId)
          .eq('processed', false);
        if (error) throw error;
        return data;
      });

      if (!reports || reports.length < 2) {
        // Not enough reports yet, or error
        // Timeout logic should be handled by a cron job or a timeout in the client
        return;
      }

      // We have at least 2 reports. Let's check for consensus.
      // Assuming a 1v1 match for now.
      const report1 = reports[0];
      const report2 = reports.find(r => r.reporter_id !== report1.reporter_id);

      if (!report2) return; // Only one player reported multiple times? Ignore.

      let consensusReached = false;

      if (report1.status === 'win' && report2.status === 'loss') {
        consensusReached = true;
      } else if (report1.status === 'loss' && report2.status === 'win') {
        consensusReached = true;
      } else if (report1.status === 'draw' && report2.status === 'draw') {
        consensusReached = true;
      }

      if (consensusReached) {
        // Update MMR for both players if not suspicious
        if (!isSuspicious) {
          const p1Rank = await rankingService.getPlayerRank(report1.reporter_id);
          const p2Rank = await rankingService.getPlayerRank(report2.reporter_id);

          if (p1Rank && p2Rank) {
            await rankingService.updateRank(report1.reporter_id, p2Rank.mmr, report1.status as 'win' | 'loss' | 'draw');
            await rankingService.updateRank(report2.reporter_id, p1Rank.mmr, report2.status as 'win' | 'loss' | 'draw');
          }
        } else {
          // Penalize trust score for suspicious matches
          await rankingService.updateTrustScore(report1.reporter_id, -10);
          await rankingService.updateTrustScore(report2.reporter_id, -10);
        }

        // Mark reports as processed
        await withRetry(async () => {
          const { error } = await supabase!
            .from('match_results')
            .update({ processed: true })
            .in('id', [report1.id, report2.id]);
          if (error) throw error;
        });
          
        // Optionally, close the room
        await withRetry(async () => {
          const { error } = await supabase!
            .from('netplay_rooms')
            .update({ status: 'closed' })
            .eq('id', roomId);
          if (error) throw error;
        });
      } else {
        // Discrepancy! Both reported win, or one draw one win, etc.
        // Mark them as processed to avoid infinite loops, but maybe flag them for review
        console.warn(`Discrepancy in room ${roomId}: Player 1 reported ${report1.status}, Player 2 reported ${report2.status}`);
        
        // Penalize both players for discrepancy
        await rankingService.updateTrustScore(report1.reporter_id, -5);
        await rankingService.updateTrustScore(report2.reporter_id, -5);

        await withRetry(async () => {
          const { error } = await supabase!
            .from('match_results')
            .update({ processed: true, status: 'disputed' }) // Mark processed so we don't keep trying
            .in('id', [report1.id, report2.id]);
          if (error) throw error;
        });
          
        await withRetry(async () => {
          const { error } = await supabase!
            .from('netplay_rooms')
            .update({ status: 'closed' })
            .eq('id', roomId);
          if (error) throw error;
        });
      }
    } catch (error) {
      console.error('Error processing room results:', error);
    }
  },
  
  async resolveTimeout(roomId: string) {
    if (!supabase) return;
    
    try {
      // Fetch all unprocessed reports for this room
      const reports = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('match_results')
          .select('*')
          .eq('room_id', roomId)
          .eq('processed', false);
        if (error) throw error;
        return data;
      });

      if (!reports || reports.length !== 1) {
        return;
      }

      const report = reports[0];
      
      // If only one report exists after timeout, accept it
      const p1Rank = await rankingService.getPlayerRank(report.reporter_id);
      const p2Rank = await rankingService.getPlayerRank(report.opponent_id);

      if (p1Rank && p2Rank) {
        await rankingService.updateRank(report.reporter_id, p2Rank.mmr, report.status as 'win' | 'loss' | 'draw');
        // The opponent gets the opposite
        const opponentStatus = report.status === 'win' ? 'loss' : (report.status === 'loss' ? 'win' : 'draw');
        await rankingService.updateRank(report.opponent_id, p1Rank.mmr, opponentStatus);
        
        // Penalize opponent for not reporting
        await rankingService.updateTrustScore(report.opponent_id, -5);
      }

      await withRetry(async () => {
        const { error } = await supabase!
          .from('match_results')
          .update({ processed: true })
          .eq('id', report.id);
        if (error) throw error;
      });
        
      await withRetry(async () => {
        const { error } = await supabase!
          .from('netplay_rooms')
          .update({ status: 'closed' })
          .eq('id', roomId);
        if (error) throw error;
      });
    } catch (error) {
      console.error('Error in resolveTimeout:', error);
    }
  },

  async resolvePendingTimeouts(userId: string) {
    if (!supabase) return;

    try {
      // Clean up stale rooms where no one reported
      await this.cleanupStaleRooms();

      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();

      const pendingReports = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('match_results')
          .select('*')
          .eq('reporter_id', userId)
          .eq('processed', false)
          .lt('reported_at', sixtySecondsAgo);
        if (error) throw error;
        return data;
      });

      if (!pendingReports) return;

      for (const report of pendingReports) {
        // Check if the opponent reported in the meantime
        const opponentReports = await withRetry(async () => {
          const { data, error } = await supabase!
            .from('match_results')
            .select('*')
            .eq('room_id', report.room_id)
            .eq('reporter_id', report.opponent_id);
          if (error) throw error;
          return data;
        });

        if (opponentReports && opponentReports.length > 0) {
          // Opponent DID report, just process normally
          await this.processRoomResults(report.room_id);
        } else {
          // Opponent DID NOT report, resolve timeout
          await this.resolveTimeout(report.room_id);
        }
      }
    } catch (error) {
      console.error('Error resolving pending timeouts:', error);
    }
  },

  async cleanupStaleRooms() {
    if (!supabase) return;
    try {
      // Find rooms that have been in 'playing' state for more than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const staleRooms = await withRetry(async () => {
        const { data, error } = await supabase!
          .from('netplay_rooms')
          .select('id')
          .eq('status', 'playing')
          .lt('created_at', oneHourAgo);
        if (error) throw error;
        return data;
      });

      if (staleRooms && staleRooms.length > 0) {
        const roomIds = staleRooms.map(r => r.id);
        await withRetry(async () => {
          const { error } = await supabase!
            .from('netplay_rooms')
            .update({ status: 'closed' })
            .in('id', roomIds);
          if (error) throw error;
        });
      }
    } catch (error) {
      console.error('Error cleaning up stale rooms:', error);
    }
  },

  async getMatchHistory(userId: string) {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('reporter_id', userId)
      .order('reported_at', { ascending: false })
      .limit(20);
      
    if (error) {
      console.error('Error fetching match history:', error);
      return [];
    }
    
    return data;
  }
};
