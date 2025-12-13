export class CreateLogDto {
    source: string;
    message: string;
    severity: string;
    metadata?: any;
    timestamp?: string;
}

