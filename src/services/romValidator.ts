import SparkMD5 from 'spark-md5';

export interface ROMValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    md5: string;
    size: number;
    headerType?: string;
  };
}

export class ROMValidator {
  /**
   * Validates a ROM blob based on system-specific rules and magic numbers.
   */
  public static async validate(blob: Blob, system: string): Promise<ROMValidationResult> {
    // 1. Basic Size Check (Minimum size for most ROMs is > 1KB, except maybe some very basic Atari games)
    if (blob.size < 1024) {
      return { isValid: false, error: 'ROM file too small (corrupted or empty)' };
    }

    // 2. Read first 512 bytes for header analysis
    const headerSize = Math.min(blob.size, 512);
    const headerBuffer = await blob.slice(0, headerSize).arrayBuffer();
    const view = new Uint8Array(headerBuffer);
    
    // Check for ZIP (PK\x03\x04)
    const isZip = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
    
    // If it's a ZIP, we assume the fetcher will extract it later. We pass validation for now.
    if (isZip) {
      return { isValid: true, metadata: { md5: 'zip-deferred', size: blob.size, headerType: 'zip' } };
    }

    let isValid = true;
    let errorMsg = '';
    let headerType = 'unknown';

    // 3. System-Specific Magic Number Checks
    switch (system.toLowerCase()) {
      case 'nes':
        // iNES Header: 'N' 'E' 'S' 0x1A
        if (!(view[0] === 0x4E && view[1] === 0x45 && view[2] === 0x53 && view[3] === 0x1A)) {
          console.warn('[ROM Validator] Invalid NES header (iNES magic number missing). Proceeding anyway as it might be headerless or a different format.');
          headerType = 'unknown-nes';
        } else {
          headerType = 'ines';
        }
        break;

      case 'snes':
        // SNES ROMs might have a 512-byte SMC header or no header.
        // It's harder to validate strictly by the first 4 bytes.
        // We'll check if it's a valid size (usually a multiple of 1024, or multiple of 1024 + 512)
        if (blob.size % 1024 !== 0 && (blob.size - 512) % 1024 !== 0) {
          console.warn('[ROM Validator] SNES ROM size is unusual, but proceeding.');
        }
        headerType = (blob.size % 1024 === 512) ? 'smc-header' : 'no-header';
        break;

      case 'n64':
        // N64 Magic Numbers at offset 0
        // Z64 (Big Endian): 80 37 12 40
        // V64 (Byte Swapped): 37 80 40 12
        // N64 (Little Endian): 40 12 37 80
        const isZ64 = view[0] === 0x80 && view[1] === 0x37 && view[2] === 0x12 && view[3] === 0x40;
        const isV64 = view[0] === 0x37 && view[1] === 0x80 && view[2] === 0x40 && view[3] === 0x12;
        const isN64 = view[0] === 0x40 && view[1] === 0x12 && view[2] === 0x37 && view[3] === 0x80;
        
        if (!isZ64 && !isV64 && !isN64) {
          console.warn('[ROM Validator] Invalid N64 header (Magic number missing). Proceeding anyway.');
          headerType = 'unknown-n64';
        } else {
          headerType = isZ64 ? 'z64' : isV64 ? 'v64' : 'n64';
        }
        break;

      case 'sega_genesis':
      case 'megadrive':
        // Genesis ROMs usually have "SEGA" at offset 0x100 (256)
        if (blob.size > 260) {
          const genesisView = new Uint8Array(await blob.slice(256, 260).arrayBuffer());
          const isSega = genesisView[0] === 0x53 && genesisView[1] === 0x45 && genesisView[2] === 0x47 && genesisView[3] === 0x41;
          if (!isSega) {
            console.warn('[ROM Validator] Genesis ROM missing "SEGA" string at 0x100. Might be interleaved or homebrew. Proceeding anyway.');
            headerType = 'unknown-genesis';
          } else {
            headerType = 'sega-standard';
          }
        }
        break;

      case 'gba':
        // GBA ROMs have a specific logo bitmap starting at 0x04. We can check the first few bytes of it.
        // 24 FF AE 51
        if (blob.size > 8) {
          const isGba = view[4] === 0x24 && view[5] === 0xFF && view[6] === 0xAE && view[7] === 0x51;
          if (!isGba) {
            console.warn('[ROM Validator] GBA ROM missing standard Nintendo logo signature. Might be modified. Proceeding anyway.');
            headerType = 'unknown-gba';
          } else {
            headerType = 'gba-standard';
          }
        }
        break;
        
      case 'psx':
        // PSX uses CHD, ISO, CUE/BIN. If it's CHD, magic is "MCom"
        const isChd = view[0] === 0x4D && view[1] === 0x43 && view[2] === 0x6F && view[3] === 0x6D;
        if (isChd) {
          headerType = 'chd';
        } else {
          // Could be cue/bin, harder to validate strictly here.
          headerType = 'psx-disc';
        }
        break;
    }

    if (!isValid) {
      return { isValid: false, error: errorMsg };
    }

    // 4. Checksum (MD5) Calculation for Integrity
    let md5Hash = 'unknown';
    try {
      // For large files (>50MB like PSX), we might want to skip full MD5 to save memory/time,
      // or do it in chunks. For now, we do full arrayBuffer if < 50MB.
      if (blob.size < 50 * 1024 * 1024) {
        const arrayBuffer = await blob.arrayBuffer();
        md5Hash = SparkMD5.ArrayBuffer.hash(arrayBuffer);
        console.log(`[ROM Validator] ${system.toUpperCase()} ROM Validated. MD5: ${md5Hash}, Size: ${blob.size} bytes`);
      } else {
        console.log(`[ROM Validator] ${system.toUpperCase()} ROM Validated. Size: ${blob.size} bytes (MD5 skipped due to size)`);
        md5Hash = 'skipped-large-file';
      }
    } catch (e) {
      return { isValid: false, error: 'Failed to calculate checksum (file unreadable or out of memory)' };
    }

    return { 
      isValid: true, 
      metadata: {
        md5: md5Hash,
        size: blob.size,
        headerType
      }
    };
  }
}
